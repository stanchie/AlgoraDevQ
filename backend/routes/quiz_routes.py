# Owner: Fhil
import json
import random

from flask import Blueprint, jsonify, request, session

from ..auth import admin_required, error, login_required
from ..db import add_points, get_db

bp = Blueprint('quiz', __name__)

POINTS_PER_CORRECT = 10
QUIZ_SIZE = 20  # questions per quiz, for both topic quizzes and the mixed quiz

# Limits for quizzes students create themselves
MAX_MY_QUIZZES = 20
MAX_QUESTIONS_PER_MY_QUIZ = 50
MAX_TITLE_LEN = 100
DEFAULT_EXPLANATION = 'No explanation added.'


def is_int(value) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def get_visible_topic(db, topic_id: int, user_id: int):
    """The topic row if this student may play it (public, or their own), else None."""
    row = db.execute('SELECT id, title, is_public, owner_id FROM topics WHERE id = ?', (topic_id,)).fetchone()
    if row is not None and (bool(row['is_public']) or row['owner_id'] == user_id):
        return row
    return None


def topic_visible_to(db, topic_id: int, user_id: int) -> bool:
    return get_visible_topic(db, topic_id, user_id) is not None


def student_view(rows) -> list[dict]:
    """Questions as students see them: no answer_index, no explanation."""
    return [{'id': r['id'], 'text': r['text'], 'options': json.loads(r['options'])} for r in rows]


def pick_mixed(db, size: int) -> list:
    """Random questions from all public topics, spread as evenly across topics as possible."""
    rows = db.execute(
        'SELECT q.id, q.text, q.options, q.topic_id FROM questions q '
        'JOIN topics t ON t.id = q.topic_id WHERE t.is_public = 1').fetchall()
    pools: dict[int, list] = {}
    for r in rows:
        pools.setdefault(r['topic_id'], []).append(r)
    pool_list = list(pools.values())
    for pool in pool_list:
        random.shuffle(pool)
    random.shuffle(pool_list)  # so no topic is always favoured when 20 doesn't divide evenly
    picked: list = []
    while len(picked) < size and any(pool_list):
        for pool in pool_list:
            if pool and len(picked) < size:
                picked.append(pool.pop())
    random.shuffle(picked)
    return picked


def validate_question(topic_id, text, options, answer_index, explanation) -> str | None:
    """Return an error message, or None when the question is valid."""
    if not is_int(topic_id):
        return 'topic_id must be an integer'
    if not isinstance(text, str) or not text.strip():
        return 'text is required'
    if len(text) > 500:
        return 'text is too long (max 500 characters)'
    if not isinstance(options, list) or len(options) < 2 or not all(isinstance(o, str) and o.strip() for o in options):
        return 'options must be a list of at least 2 non-empty strings'
    if len(options) > 6 or any(len(o) > 200 for o in options):
        return 'use at most 6 options, each up to 200 characters'
    if not is_int(answer_index) or not 0 <= answer_index < len(options):
        return 'answer_index must point at one of the options'
    if not isinstance(explanation, str) or not explanation.strip():
        return 'explanation is required'
    if len(explanation) > 1000:
        return 'explanation is too long (max 1000 characters)'
    return None


def admin_view(row) -> dict:
    """Full question including the answer. Only ever returned to admins."""
    return {
        'id': row['id'], 'topic_id': row['topic_id'], 'text': row['text'],
        'options': json.loads(row['options']), 'answer_index': row['answer_index'],
        'explanation': row['explanation'],
    }


# ---------- Student endpoints ----------
@bp.get('/api/topics/<int:topic_id>/questions')
@login_required
def questions(topic_id: int):
    db = get_db()
    if not topic_visible_to(db, topic_id, session['user_id']):
        return error('Topic not found', 404)
    rows = db.execute(
        'SELECT id, text, options FROM questions WHERE topic_id = ? ORDER BY RANDOM() LIMIT ?',
        (topic_id, QUIZ_SIZE)).fetchall()
    # answer_index and explanation are deliberately left out. They are revealed by /api/quiz/submit.
    return jsonify(success=True, questions=student_view(rows), total_questions=len(rows))


@bp.get('/api/quiz/mixed/questions')
@login_required
def mixed_questions():
    """A 20-question quiz drawn from every public topic."""
    rows = pick_mixed(get_db(), QUIZ_SIZE)
    return jsonify(success=True, questions=student_view(rows), total_questions=len(rows))


@bp.post('/api/quiz/submit')
@login_required
def submit():
    """Body for a topic quiz: {"topic_id": 1, "answers": [{"question_id": 3, "answer_index": 0}, ...]}
    Body for the mixed quiz: {"mixed": true, "answers": [...]}
    """
    body = request.get_json(silent=True) or {}
    mixed = body.get('mixed') is True
    topic_id, answers = body.get('topic_id'), body.get('answers')
    if not isinstance(answers, list) or not answers or (not mixed and not is_int(topic_id)):
        return error('A non-empty answers list and either topic_id or mixed=true are required', 400)
    if len(answers) > QUIZ_SIZE:
        return error(f'A quiz has at most {QUIZ_SIZE} questions', 400)

    user_id = session['user_id']
    db = get_db()
    earns_points = True
    if mixed:
        bank_rows = db.execute(
            'SELECT q.id, q.options, q.answer_index, q.explanation FROM questions q '
            'JOIN topics t ON t.id = q.topic_id WHERE t.is_public = 1').fetchall()
    else:
        topic = get_visible_topic(db, topic_id, user_id)
        if topic is None:
            return error('Topic not found', 404)
        # Quizzes a student wrote themselves (owner_id set) are practice only. Otherwise a student could
        # write easy questions for themselves and farm points.
        earns_points = topic['owner_id'] is None
        bank_rows = db.execute(
            'SELECT id, options, answer_index, explanation FROM questions WHERE topic_id = ?', (topic_id,)).fetchall()
    bank = {r['id']: r for r in bank_rows}

    graded, seen = [], set()
    for a in answers:
        qid = a.get('question_id') if isinstance(a, dict) else None
        idx = a.get('answer_index') if isinstance(a, dict) else None
        if not is_int(qid) or not is_int(idx):
            return error('Each answer needs integer question_id and answer_index', 400)
        if qid not in bank:
            return error(f'Question {qid} is not part of this quiz', 400)
        if qid in seen:
            return error(f'Question {qid} was answered more than once', 400)
        if not 0 <= idx < len(json.loads(bank[qid]['options'])):
            return error(f'Invalid option for question {qid}', 400)
        seen.add(qid)
        graded.append((qid, idx))

    results, earned = [], 0
    for qid, idx in graded:
        q = bank[qid]
        correct = idx == q['answer_index']
        points = 0
        if correct and earns_points:
            # A question only pays out once per student, so replaying a quiz can't farm points.
            # The UNIQUE(user_id, question_id) constraint makes this safe even under double submits.
            inserted = db.execute(
                'INSERT OR IGNORE INTO quiz_awards (user_id, question_id) VALUES (?, ?)', (user_id, qid))
            if inserted.rowcount == 1:
                points = POINTS_PER_CORRECT
        earned += points
        results.append({
            'question_id': qid, 'correct': correct, 'points_awarded': points,
            'correct_index': q['answer_index'], 'explanation': q['explanation'],
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


# ---------- Admin endpoints ----------
@bp.post('/api/admin/questions')
@admin_required
def create_question():
    b = request.get_json(silent=True) or {}
    problem = validate_question(b.get('topic_id'), b.get('text'), b.get('options'),
                                b.get('answer_index'), b.get('explanation'))
    if problem:
        return error(problem, 400)
    db = get_db()
    if db.execute('SELECT 1 FROM topics WHERE id = ?', (b['topic_id'],)).fetchone() is None:
        return error('Topic not found', 404)
    cur = db.execute(
        'INSERT INTO questions (topic_id, text, options, answer_index, explanation) VALUES (?, ?, ?, ?, ?)',
        (b['topic_id'], b['text'].strip(), json.dumps(b['options']), b['answer_index'], b['explanation'].strip()))
    db.commit()
    row = db.execute('SELECT * FROM questions WHERE id = ?', (cur.lastrowid,)).fetchone()
    return jsonify(success=True, question=admin_view(row)), 201


@bp.put('/api/admin/questions/<int:question_id>')
@admin_required
def update_question(question_id: int):
    db = get_db()
    row = db.execute('SELECT * FROM questions WHERE id = ?', (question_id,)).fetchone()
    if row is None:
        return error('Question not found', 404)
    b = request.get_json(silent=True) or {}
    current = admin_view(row)
    merged = {k: b.get(k, current[k]) for k in ('topic_id', 'text', 'options', 'answer_index', 'explanation')}
    problem = validate_question(**merged)
    if problem:
        return error(problem, 400)
    if db.execute('SELECT 1 FROM topics WHERE id = ?', (merged['topic_id'],)).fetchone() is None:
        return error('Topic not found', 404)
    db.execute(
        'UPDATE questions SET topic_id = ?, text = ?, options = ?, answer_index = ?, explanation = ? WHERE id = ?',
        (merged['topic_id'], merged['text'].strip(), json.dumps(merged['options']),
         merged['answer_index'], merged['explanation'].strip(), question_id))
    db.commit()
    row = db.execute('SELECT * FROM questions WHERE id = ?', (question_id,)).fetchone()
    return jsonify(success=True, question=admin_view(row))


@bp.delete('/api/admin/questions/<int:question_id>')
@admin_required
def delete_question(question_id: int):
    db = get_db()
    cur = db.execute('DELETE FROM questions WHERE id = ?', (question_id,))
    db.commit()
    if cur.rowcount == 0:
        return error('Question not found', 404)
    return jsonify(success=True, message='Question deleted')


# ---------- Student-made quizzes ----------
# A student's own quiz is a private topic (owner_id = their id, is_public = 0). It is played with the same
# endpoints as any topic (GET /api/topics/<id>/questions and POST /api/quiz/submit) but never awards points.
def own_topic(db, topic_id: int, user_id: int):
    return db.execute('SELECT id, title FROM topics WHERE id = ? AND owner_id = ?', (topic_id, user_id)).fetchone()


def own_question(db, question_id: int, user_id: int):
    return db.execute(
        'SELECT q.* FROM questions q JOIN topics t ON t.id = q.topic_id WHERE q.id = ? AND t.owner_id = ?',
        (question_id, user_id)).fetchone()


def clean_title(value) -> str | None:
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > MAX_TITLE_LEN:
        return None
    return value.strip()


@bp.get('/api/my/quizzes')
@login_required
def my_quizzes():
    rows = get_db().execute(
        'SELECT t.id, t.title, (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) AS question_count '
        'FROM topics t WHERE t.owner_id = ? ORDER BY t.id', (session['user_id'],)).fetchall()
    return jsonify(success=True, quizzes=[dict(r) for r in rows])


@bp.post('/api/my/quizzes')
@login_required
def create_my_quiz():
    """Body: {"title": "My recursion quiz"}"""
    user_id = session['user_id']
    title = clean_title((request.get_json(silent=True) or {}).get('title'))
    if title is None:
        return error(f'title is required (max {MAX_TITLE_LEN} characters)', 400)
    db = get_db()
    owned = db.execute('SELECT COUNT(*) AS n FROM topics WHERE owner_id = ?', (user_id,)).fetchone()['n']
    if owned >= MAX_MY_QUIZZES:
        return error(f'You can have at most {MAX_MY_QUIZZES} quizzes', 409)
    cur = db.execute('INSERT INTO topics (title, owner_id, is_public) VALUES (?, ?, 0)', (title, user_id))
    db.commit()
    return jsonify(success=True, quiz={'id': cur.lastrowid, 'title': title, 'question_count': 0}), 201


@bp.put('/api/my/quizzes/<int:quiz_id>')
@login_required
def rename_my_quiz(quiz_id: int):
    db = get_db()
    if own_topic(db, quiz_id, session['user_id']) is None:
        return error('Quiz not found', 404)
    title = clean_title((request.get_json(silent=True) or {}).get('title'))
    if title is None:
        return error(f'title is required (max {MAX_TITLE_LEN} characters)', 400)
    db.execute('UPDATE topics SET title = ? WHERE id = ?', (title, quiz_id))
    db.commit()
    return jsonify(success=True, quiz={'id': quiz_id, 'title': title})


@bp.delete('/api/my/quizzes/<int:quiz_id>')
@login_required
def delete_my_quiz(quiz_id: int):
    db = get_db()
    if own_topic(db, quiz_id, session['user_id']) is None:
        return error('Quiz not found', 404)
    if db.execute('SELECT 1 FROM lessons WHERE topic_id = ?', (quiz_id,)).fetchone():
        return error('This topic still has lessons. Remove them first.', 409)
    db.execute('DELETE FROM questions WHERE topic_id = ?', (quiz_id,))
    db.execute('DELETE FROM topics WHERE id = ?', (quiz_id,))
    db.commit()
    return jsonify(success=True, message='Quiz deleted')


@bp.get('/api/my/quizzes/<int:quiz_id>/questions')
@login_required
def my_quiz_questions(quiz_id: int):
    """The owner's editing view: includes answer_index and explanation (these are the student's own questions)."""
    db = get_db()
    topic = own_topic(db, quiz_id, session['user_id'])
    if topic is None:
        return error('Quiz not found', 404)
    rows = db.execute('SELECT * FROM questions WHERE topic_id = ? ORDER BY id', (quiz_id,)).fetchall()
    return jsonify(success=True, quiz={'id': topic['id'], 'title': topic['title']},
                   questions=[admin_view(r) for r in rows])


@bp.post('/api/my/quizzes/<int:quiz_id>/questions')
@login_required
def add_my_question(quiz_id: int):
    """Body: {"text": "...", "options": ["a", "b"], "answer_index": 0, "explanation": "optional"}"""
    db = get_db()
    if own_topic(db, quiz_id, session['user_id']) is None:
        return error('Quiz not found', 404)
    b = request.get_json(silent=True) or {}
    explanation = b.get('explanation')
    if explanation is None or (isinstance(explanation, str) and not explanation.strip()):
        explanation = DEFAULT_EXPLANATION
    problem = validate_question(quiz_id, b.get('text'), b.get('options'), b.get('answer_index'), explanation)
    if problem:
        return error(problem, 400)
    count = db.execute('SELECT COUNT(*) AS n FROM questions WHERE topic_id = ?', (quiz_id,)).fetchone()['n']
    if count >= MAX_QUESTIONS_PER_MY_QUIZ:
        return error(f'A quiz can have at most {MAX_QUESTIONS_PER_MY_QUIZ} questions', 409)
    cur = db.execute(
        'INSERT INTO questions (topic_id, text, options, answer_index, explanation) VALUES (?, ?, ?, ?, ?)',
        (quiz_id, b['text'].strip(), json.dumps(b['options']), b['answer_index'], explanation.strip()))
    db.commit()
    row = db.execute('SELECT * FROM questions WHERE id = ?', (cur.lastrowid,)).fetchone()
    return jsonify(success=True, question=admin_view(row)), 201


@bp.put('/api/my/questions/<int:question_id>')
@login_required
def update_my_question(question_id: int):
    db = get_db()
    row = own_question(db, question_id, session['user_id'])
    if row is None:
        return error('Question not found', 404)
    b = request.get_json(silent=True) or {}
    current = admin_view(row)
    merged = {k: b.get(k, current[k]) for k in ('text', 'options', 'answer_index', 'explanation')}
    if isinstance(merged['explanation'], str) and not merged['explanation'].strip():
        merged['explanation'] = DEFAULT_EXPLANATION
    problem = validate_question(row['topic_id'], **merged)  # the quiz a question belongs to can't be changed
    if problem:
        return error(problem, 400)
    db.execute(
        'UPDATE questions SET text = ?, options = ?, answer_index = ?, explanation = ? WHERE id = ?',
        (merged['text'].strip(), json.dumps(merged['options']), merged['answer_index'],
         merged['explanation'].strip(), question_id))
    db.commit()
    row = db.execute('SELECT * FROM questions WHERE id = ?', (question_id,)).fetchone()
    return jsonify(success=True, question=admin_view(row))


@bp.delete('/api/my/questions/<int:question_id>')
@login_required
def delete_my_question(question_id: int):
    db = get_db()
    if own_question(db, question_id, session['user_id']) is None:
        return error('Question not found', 404)
    db.execute('DELETE FROM questions WHERE id = ?', (question_id,))
    db.commit()
    return jsonify(success=True, message='Question deleted')
