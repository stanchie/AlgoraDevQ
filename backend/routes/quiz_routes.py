MAX_TITLE_LEN = 100
DEFAULT_EXPLANATION = 'No explanation added.'

# Responses follow the frontend contract: {"success": true, "data": ...} with camelCase field names.
# Request bodies use camelCase too (snake_case is still accepted).
_MISSING = object()


def ok(data=None, status: int = 200, **extra):
    body = {'success': True, **extra}
    if data is not None:
        body['data'] = data
    return jsonify(body), status


def pick(body: dict, camel: str):
    """Read a field by its camelCase name, falling back to snake_case. Returns _MISSING when absent."""
    snake = ''.join('_' + c.lower() if c.isupper() else c for c in camel)
    if camel in body:
        return body[camel]
    if snake in body:
        return body[snake]
    return _MISSING


def val(body: dict, camel: str, default=None):
    value = pick(body, camel)
    return default if value is _MISSING else value


def is_int(value) -> bool:
return isinstance(value, int) and not isinstance(value, bool)
@@ -36,8 +62,9 @@ def topic_visible_to(db, topic_id: int, user_id: int) -> bool:


def student_view(rows) -> list[dict]:
    """Questions as students see them: no answer_index, no explanation."""
    return [{'id': r['id'], 'text': r['text'], 'options': json.loads(r['options'])} for r in rows]
    """Questions as students see them: no answerIndex, no explanation."""
    return [{'id': r['id'], 'topicId': r['topic_id'], 'text': r['text'], 'options': json.loads(r['options'])}
            for r in rows]


def pick_mixed(db, size: int) -> list:
@@ -64,7 +91,7 @@ def pick_mixed(db, size: int) -> list:
def validate_question(topic_id, text, options, answer_index, explanation) -> str | None:
"""Return an error message, or None when the question is valid."""
if not is_int(topic_id):
        return 'topic_id must be an integer'
        return 'topicId must be an integer'
if not isinstance(text, str) or not text.strip():
return 'text is required'
if len(text) > 500:
@@ -74,7 +101,7 @@ def validate_question(topic_id, text, options, answer_index, explanation) -> str
if len(options) > 6 or any(len(o) > 200 for o in options):
return 'use at most 6 options, each up to 200 characters'
if not is_int(answer_index) or not 0 <= answer_index < len(options):
        return 'answer_index must point at one of the options'
        return 'answerIndex must point at one of the options'
if not isinstance(explanation, str) or not explanation.strip():
return 'explanation is required'
if len(explanation) > 1000:
@@ -83,10 +110,10 @@ def validate_question(topic_id, text, options, answer_index, explanation) -> str


def admin_view(row) -> dict:
    """Full question including the answer. Only ever returned to admins."""
    """Full question including the answer. Only ever returned to admins or to the question's owner."""
return {
        'id': row['id'], 'topic_id': row['topic_id'], 'text': row['text'],
        'options': json.loads(row['options']), 'answer_index': row['answer_index'],
        'id': row['id'], 'topicId': row['topic_id'], 'text': row['text'],
        'options': json.loads(row['options']), 'answerIndex': row['answer_index'],
'explanation': row['explanation'],
}

@@ -95,35 +122,34 @@ def admin_view(row) -> dict:
@bp.get('/api/topics/<int:topic_id>/questions')
@login_required
def questions(topic_id: int):
    """Up to 20 random questions from the topic. answerIndex and explanation are never included."""
db = get_db()
if not topic_visible_to(db, topic_id, session['user_id']):
return error('Topic not found', 404)
rows = db.execute(
        'SELECT id, text, options FROM questions WHERE topic_id = ? ORDER BY RANDOM() LIMIT ?',
        'SELECT id, topic_id, text, options FROM questions WHERE topic_id = ? ORDER BY RANDOM() LIMIT ?',
(topic_id, QUIZ_SIZE)).fetchall()
    # answer_index and explanation are deliberately left out. They are revealed by /api/quiz/submit.
    return jsonify(success=True, questions=student_view(rows), total_questions=len(rows))
    return ok(student_view(rows))


@bp.get('/api/quiz/mixed/questions')
@login_required
def mixed_questions():
"""A 20-question quiz drawn from every public topic."""
    rows = pick_mixed(get_db(), QUIZ_SIZE)
    return jsonify(success=True, questions=student_view(rows), total_questions=len(rows))
    return ok(student_view(pick_mixed(get_db(), QUIZ_SIZE)))


@bp.post('/api/quiz/submit')
@login_required
def submit():
    """Body for a topic quiz: {"topic_id": 1, "answers": [{"question_id": 3, "answer_index": 0}, ...]}
    """Body for a topic quiz: {"topicId": 1, "answers": [{"questionId": 3, "answerIndex": 0}, ...]}
   Body for the mixed quiz: {"mixed": true, "answers": [...]}
   """
body = request.get_json(silent=True) or {}
mixed = body.get('mixed') is True
    topic_id, answers = body.get('topic_id'), body.get('answers')
    topic_id, answers = pick(body, 'topicId'), body.get('answers')
if not isinstance(answers, list) or not answers or (not mixed and not is_int(topic_id)):
        return error('A non-empty answers list and either topic_id or mixed=true are required', 400)
        return error('A non-empty answers list and either topicId or mixed=true are required', 400)
if len(answers) > QUIZ_SIZE:
return error(f'A quiz has at most {QUIZ_SIZE} questions', 400)

@@ -147,10 +173,10 @@ def submit():

graded, seen = [], set()
for a in answers:
        qid = a.get('question_id') if isinstance(a, dict) else None
        idx = a.get('answer_index') if isinstance(a, dict) else None
        qid = pick(a, 'questionId') if isinstance(a, dict) else _MISSING
        idx = pick(a, 'answerIndex') if isinstance(a, dict) else _MISSING
if not is_int(qid) or not is_int(idx):
            return error('Each answer needs integer question_id and answer_index', 400)
            return error('Each answer needs integer questionId and answerIndex', 400)
if qid not in bank:
return error(f'Question {qid} is not part of this quiz', 400)
if qid in seen:
@@ -174,40 +200,70 @@ def submit():
points = POINTS_PER_CORRECT
earned += points
results.append({
            'question_id': qid, 'correct': correct, 'points_awarded': points,
            'correct_index': q['answer_index'], 'explanation': q['explanation'],
            'questionId': qid, 'correct': correct, 'pointsAwarded': points,
            'correctIndex': q['answer_index'], 'explanation': q['explanation'],
})

total_points = add_points(user_id, earned)  # also commits the quiz_awards rows above
    return jsonify(
        success=True,
        results=results,
        correct_count=sum(r['correct'] for r in results),
        total_questions=len(results),
        points_earned=earned,
        total_points=total_points,
        points_enabled=earns_points,  # False for a student's own quiz: practice only
    )
    return ok({
        'results': results,
        'correctCount': sum(r['correct'] for r in results),
        'totalQuestions': len(results),
        'pointsEarned': earned,
        'totalPoints': total_points,
        'pointsEnabled': earns_points,  # False for a student's own quiz: practice only
    })


# ---------- Admin endpoints ----------
# The admin quiz page manages the official topics (owner_id IS NULL). Students' private quizzes are not listed.
@bp.get('/api/admin/quiz/topics')
@admin_required
def admin_quiz_topics():
    """Every official topic with how many questions it has, so admins can see which need more."""
    rows = get_db().execute(
        'SELECT t.id, t.title, (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) AS question_count '
        'FROM topics t WHERE t.owner_id IS NULL ORDER BY t.id').fetchall()
    return ok({
        'topics': [{'id': r['id'], 'title': r['title'], 'questionCount': r['question_count']} for r in rows],
        'quizSize': QUIZ_SIZE,
    })


@bp.get('/api/admin/topics/<int:topic_id>/questions')
@admin_required
def admin_topic_questions(topic_id: int):
    """All questions of one official topic, including answerIndex and explanation."""
    db = get_db()
    topic = db.execute('SELECT id, title FROM topics WHERE id = ? AND owner_id IS NULL', (topic_id,)).fetchone()
    if topic is None:
        return error('Topic not found', 404)
    rows = db.execute('SELECT * FROM questions WHERE topic_id = ? ORDER BY id', (topic_id,)).fetchall()
    return ok({
        'topic': {'id': topic['id'], 'title': topic['title'], 'questionCount': len(rows)},
        'questions': [admin_view(r) for r in rows],
        'quizSize': QUIZ_SIZE,
    })


@bp.post('/api/admin/questions')
@admin_required
def create_question():
b = request.get_json(silent=True) or {}
    problem = validate_question(b.get('topic_id'), b.get('text'), b.get('options'),
                                b.get('answer_index'), b.get('explanation'))
    topic_id, text, options = val(b, 'topicId'), val(b, 'text'), val(b, 'options')
    answer_index, explanation = val(b, 'answerIndex'), val(b, 'explanation')
    problem = validate_question(topic_id, text, options, answer_index, explanation)
if problem:
return error(problem, 400)
db = get_db()
    if db.execute('SELECT 1 FROM topics WHERE id = ?', (b['topic_id'],)).fetchone() is None:
    if db.execute('SELECT 1 FROM topics WHERE id = ?', (topic_id,)).fetchone() is None:
return error('Topic not found', 404)
cur = db.execute(
'INSERT INTO questions (topic_id, text, options, answer_index, explanation) VALUES (?, ?, ?, ?, ?)',
        (b['topic_id'], b['text'].strip(), json.dumps(b['options']), b['answer_index'], b['explanation'].strip()))
        (topic_id, text.strip(), json.dumps(options), answer_index, explanation.strip()))
db.commit()
row = db.execute('SELECT * FROM questions WHERE id = ?', (cur.lastrowid,)).fetchone()
    return jsonify(success=True, question=admin_view(row)), 201
    return ok(admin_view(row), 201)


@bp.put('/api/admin/questions/<int:question_id>')
@@ -219,19 +275,20 @@ def update_question(question_id: int):
return error('Question not found', 404)
b = request.get_json(silent=True) or {}
current = admin_view(row)
    merged = {k: b.get(k, current[k]) for k in ('topic_id', 'text', 'options', 'answer_index', 'explanation')}
    problem = validate_question(**merged)
    merged = {k: val(b, k, current[k]) for k in ('topicId', 'text', 'options', 'answerIndex', 'explanation')}
    problem = validate_question(merged['topicId'], merged['text'], merged['options'],
                                merged['answerIndex'], merged['explanation'])
if problem:
return error(problem, 400)
    if db.execute('SELECT 1 FROM topics WHERE id = ?', (merged['topic_id'],)).fetchone() is None:
    if db.execute('SELECT 1 FROM topics WHERE id = ?', (merged['topicId'],)).fetchone() is None:
return error('Topic not found', 404)
db.execute(
'UPDATE questions SET topic_id = ?, text = ?, options = ?, answer_index = ?, explanation = ? WHERE id = ?',
        (merged['topic_id'], merged['text'].strip(), json.dumps(merged['options']),
         merged['answer_index'], merged['explanation'].strip(), question_id))
        (merged['topicId'], merged['text'].strip(), json.dumps(merged['options']),
         merged['answerIndex'], merged['explanation'].strip(), question_id))
db.commit()
row = db.execute('SELECT * FROM questions WHERE id = ?', (question_id,)).fetchone()
    return jsonify(success=True, question=admin_view(row))
    return ok(admin_view(row))


@bp.delete('/api/admin/questions/<int:question_id>')
@@ -242,7 +299,7 @@ def delete_question(question_id: int):
db.commit()
if cur.rowcount == 0:
return error('Question not found', 404)
    return jsonify(success=True, message='Question deleted')
    return ok(message='Question deleted')


# ---------- Student-made quizzes ----------
@@ -270,7 +327,7 @@ def my_quizzes():
rows = get_db().execute(
'SELECT t.id, t.title, (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) AS question_count '
'FROM topics t WHERE t.owner_id = ? ORDER BY t.id', (session['user_id'],)).fetchall()
    return jsonify(success=True, quizzes=[dict(r) for r in rows])
    return ok([{'id': r['id'], 'title': r['title'], 'questionCount': r['question_count']} for r in rows])


@bp.post('/api/my/quizzes')
@@ -287,7 +344,7 @@ def create_my_quiz():
return error(f'You can have at most {MAX_MY_QUIZZES} quizzes', 409)
cur = db.execute('INSERT INTO topics (title, owner_id, is_public) VALUES (?, ?, 0)', (title, user_id))
db.commit()
    return jsonify(success=True, quiz={'id': cur.lastrowid, 'title': title, 'question_count': 0}), 201
    return ok({'id': cur.lastrowid, 'title': title, 'questionCount': 0}, 201)


@bp.put('/api/my/quizzes/<int:quiz_id>')
@@ -301,7 +358,7 @@ def rename_my_quiz(quiz_id: int):
return error(f'title is required (max {MAX_TITLE_LEN} characters)', 400)
db.execute('UPDATE topics SET title = ? WHERE id = ?', (title, quiz_id))
db.commit()
    return jsonify(success=True, quiz={'id': quiz_id, 'title': title})
    return ok({'id': quiz_id, 'title': title})


@bp.delete('/api/my/quizzes/<int:quiz_id>')
@@ -315,45 +372,45 @@ def delete_my_quiz(quiz_id: int):
db.execute('DELETE FROM questions WHERE topic_id = ?', (quiz_id,))
db.execute('DELETE FROM topics WHERE id = ?', (quiz_id,))
db.commit()
    return jsonify(success=True, message='Quiz deleted')
    return ok(message='Quiz deleted')


@bp.get('/api/my/quizzes/<int:quiz_id>/questions')
@login_required
def my_quiz_questions(quiz_id: int):
    """The owner's editing view: includes answer_index and explanation (these are the student's own questions)."""
    """The owner's editing view: includes answerIndex and explanation (these are the student's own questions)."""
db = get_db()
topic = own_topic(db, quiz_id, session['user_id'])
if topic is None:
return error('Quiz not found', 404)
rows = db.execute('SELECT * FROM questions WHERE topic_id = ? ORDER BY id', (quiz_id,)).fetchall()
    return jsonify(success=True, quiz={'id': topic['id'], 'title': topic['title']},
                   questions=[admin_view(r) for r in rows])
    return ok({'quiz': {'id': topic['id'], 'title': topic['title']}, 'questions': [admin_view(r) for r in rows]})


@bp.post('/api/my/quizzes/<int:quiz_id>/questions')
@login_required
def add_my_question(quiz_id: int):
    """Body: {"text": "...", "options": ["a", "b"], "answer_index": 0, "explanation": "optional"}"""
    """Body: {"text": "...", "options": ["a", "b"], "answerIndex": 0, "explanation": "optional"}"""
db = get_db()
if own_topic(db, quiz_id, session['user_id']) is None:
return error('Quiz not found', 404)
b = request.get_json(silent=True) or {}
    explanation = b.get('explanation')
    text, options, answer_index = val(b, 'text'), val(b, 'options'), val(b, 'answerIndex')
    explanation = val(b, 'explanation')
if explanation is None or (isinstance(explanation, str) and not explanation.strip()):
explanation = DEFAULT_EXPLANATION
    problem = validate_question(quiz_id, b.get('text'), b.get('options'), b.get('answer_index'), explanation)
    problem = validate_question(quiz_id, text, options, answer_index, explanation)
if problem:
return error(problem, 400)
count = db.execute('SELECT COUNT(*) AS n FROM questions WHERE topic_id = ?', (quiz_id,)).fetchone()['n']
if count >= MAX_QUESTIONS_PER_MY_QUIZ:
return error(f'A quiz can have at most {MAX_QUESTIONS_PER_MY_QUIZ} questions', 409)
cur = db.execute(
'INSERT INTO questions (topic_id, text, options, answer_index, explanation) VALUES (?, ?, ?, ?, ?)',
        (quiz_id, b['text'].strip(), json.dumps(b['options']), b['answer_index'], explanation.strip()))
        (quiz_id, text.strip(), json.dumps(options), answer_index, explanation.strip()))
db.commit()
row = db.execute('SELECT * FROM questions WHERE id = ?', (cur.lastrowid,)).fetchone()
    return jsonify(success=True, question=admin_view(row)), 201
    return ok(admin_view(row), 201)


@bp.put('/api/my/questions/<int:question_id>')
@@ -365,19 +422,21 @@ def update_my_question(question_id: int):
return error('Question not found', 404)
b = request.get_json(silent=True) or {}
current = admin_view(row)
    merged = {k: b.get(k, current[k]) for k in ('text', 'options', 'answer_index', 'explanation')}
    merged = {k: val(b, k, current[k]) for k in ('text', 'options', 'answerIndex', 'explanation')}
if isinstance(merged['explanation'], str) and not merged['explanation'].strip():
merged['explanation'] = DEFAULT_EXPLANATION
    problem = validate_question(row['topic_id'], **merged)  # the quiz a question belongs to can't be changed
    # the quiz a question belongs to can't be changed
    problem = validate_question(row['topic_id'], merged['text'], merged['options'],
                                merged['answerIndex'], merged['explanation'])
if problem:
return error(problem, 400)
db.execute(
'UPDATE questions SET text = ?, options = ?, answer_index = ?, explanation = ? WHERE id = ?',
        (merged['text'].strip(), json.dumps(merged['options']), merged['answer_index'],
        (merged['text'].strip(), json.dumps(merged['options']), merged['answerIndex'],
merged['explanation'].strip(), question_id))
db.commit()
row = db.execute('SELECT * FROM questions WHERE id = ?', (question_id,)).fetchone()
    return jsonify(success=True, question=admin_view(row))
    return ok(admin_view(row))


@bp.delete('/api/my/questions/<int:question_id>')
@@ -388,4 +447,4 @@ def delete_my_question(question_id: int):
return error('Question not found', 404)
db.execute('DELETE FROM questions WHERE id = ?', (question_id,))
db.commit()
    return jsonify(success=True, message='Question deleted')
    return ok(message='Question deleted')
