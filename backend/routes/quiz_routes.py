from __future__ import annotations

import json
from flask import Blueprint, jsonify, request, session

from ..auth import admin_required, error, login_required
from ..db import get_db

bp = Blueprint('quiz', __name__)
QUIZ_SIZE = 20
POINTS_PER_CORRECT = 10
MAX_TITLE_LEN = 100
MAX_MY_QUIZZES = 10
MAX_QUESTIONS_PER_MY_QUIZ = 100
DEFAULT_EXPLANATION = 'No explanation added.'
_MISSING = object()


def ok(data=None, status=200, **extra):
    body = {'success': True, **extra}
    if data is not None:
        body['data'] = data
    return jsonify(body), status


def pick(body, camel):
    snake = ''.join('_' + char.lower() if char.isupper() else char for char in camel)
    if camel in body:
        return body[camel]
    return body.get(snake, _MISSING)


def is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def topic_visible_to(db, topic_id, user_id):
    return db.execute(
        'SELECT 1 FROM topics WHERE id = ? AND ((owner_id IS NULL AND is_public = 1) OR owner_id = ?)',
        (topic_id, user_id),
    ).fetchone() is not None


def own_topic(db, topic_id, user_id):
    return db.execute('SELECT id, title FROM topics WHERE id = ? AND owner_id = ?', (topic_id, user_id)).fetchone()


def student_view(rows):
    return [{'id': row['id'], 'topicId': row['topic_id'], 'text': row['text'],
             'options': json.loads(row['options'])} for row in rows]


def pick_mixed(db, size):
    return db.execute(
        'SELECT q.id, q.topic_id, q.text, q.options FROM questions q '
        'JOIN topics t ON t.id = q.topic_id WHERE t.owner_id IS NULL AND t.is_public = 1 '
        'ORDER BY RANDOM() LIMIT ?', (size,),
    ).fetchall()


def validate_question(topic_id, text, options, answer_index, explanation):
    if not is_int(topic_id):
        return 'topicId must be an integer'
    if not isinstance(text, str) or not text.strip() or len(text) > 500:
        return 'text is required and must be at most 500 characters'
    if not isinstance(options, list) or not 2 <= len(options) <= 6:
        return 'use between 2 and 6 options'
    if any(not isinstance(option, str) or not option.strip() or len(option) > 200 for option in options):
        return 'each option is required and must be at most 200 characters'
    if len({option.strip().casefold() for option in options}) != len(options):
        return 'each option must be different'
    if not is_int(answer_index) or not 0 <= answer_index < len(options):
        return 'answerIndex must point at one of the options'
    if not isinstance(explanation, str) or not explanation.strip() or len(explanation) > 1000:
        return 'explanation is required and must be at most 1000 characters'
    return None


def admin_view(row):
    return {'id': row['id'], 'topicId': row['topic_id'], 'text': row['text'],
            'options': json.loads(row['options']), 'answerIndex': row['answer_index'],
            'explanation': row['explanation']}


@bp.get('/api/topics/<int:topic_id>/questions')
@login_required
def questions(topic_id):
    db = get_db()
    if not topic_visible_to(db, topic_id, session['user_id']):
        return error('Topic not found', 404)
    rows = db.execute(
        'SELECT id, topic_id, text, options FROM questions WHERE topic_id = ? ORDER BY RANDOM() LIMIT ?',
        (topic_id, QUIZ_SIZE),
    ).fetchall()
    return ok(student_view(rows))


@bp.get('/api/quiz/mixed/questions')
@login_required
def mixed_questions():
    return ok(student_view(pick_mixed(get_db(), QUIZ_SIZE)))


@bp.post('/api/quiz/submit')
@login_required
def submit():
    body = request.get_json(silent=True) or {}
    mixed = body.get('mixed') is True
    topic_id = pick(body, 'topicId')
    answers = body.get('answers')
    if not isinstance(answers, list) or not answers or len(answers) > QUIZ_SIZE:
        return error(f'Provide between 1 and {QUIZ_SIZE} answers', 400)
    if (mixed and topic_id is not _MISSING) or (not mixed and not is_int(topic_id)):
        return error('Provide either topicId or mixed=true', 400)
    db = get_db()
    user_id = session['user_id']
    if not mixed and not topic_visible_to(db, topic_id, user_id):
        return error('Topic not found', 404)

    seen = set()
    submitted = []
    for answer in answers:
        if not isinstance(answer, dict):
            return error('Each answer must include questionId and answerIndex', 400)
        qid, index = pick(answer, 'questionId'), pick(answer, 'answerIndex')
        if not is_int(qid) or not is_int(index) or qid in seen:
            return error('Each answer needs unique integer questionId and answerIndex values', 400)
        seen.add(qid)
        row = db.execute(
            'SELECT q.id, q.topic_id, q.options, q.answer_index, q.explanation, t.owner_id, t.is_public '
            'FROM questions q JOIN topics t ON t.id = q.topic_id WHERE q.id = ?', (qid,),
        ).fetchone()
        allowed = row is not None and (
            (row['owner_id'] is None and row['is_public'] == 1) if mixed else row['topic_id'] == topic_id
        )
        if not allowed:
            return error(f'Question {qid} is not part of this quiz', 400)
        if not 0 <= index < len(json.loads(row['options'])):
            return error(f'answerIndex for question {qid} is out of range', 400)
        submitted.append((row, index))

    earns_points = all(row['owner_id'] is None for row, _ in submitted)
    results = []
    earned = 0
    try:
        for row, index in submitted:
            correct = index == row['answer_index']
            awarded = 0
            if correct and earns_points:
                cursor = db.execute(
                    'INSERT OR IGNORE INTO quiz_awards (user_id, question_id) VALUES (?, ?)',
                    (user_id, row['id']),
                )
                if cursor.rowcount == 1:
                    awarded = POINTS_PER_CORRECT
                    earned += awarded
            results.append({'questionId': row['id'], 'correct': correct,
                            'pointsAwarded': awarded, 'correctIndex': row['answer_index'],
                            'explanation': row['explanation']})
        db.execute('UPDATE users SET points = points + ? WHERE id = ?', (earned, user_id))
        db.commit()
    except Exception:
        db.rollback()
        raise
    user = db.execute('SELECT points FROM users WHERE id = ?', (user_id,)).fetchone()
    return ok({'results': results, 'correctCount': sum(result['correct'] for result in results),
               'totalQuestions': len(results), 'pointsEarned': earned,
               'totalPoints': int(user['points']), 'pointsEnabled': earns_points})


@bp.get('/api/admin/quiz/topics')
@admin_required
def admin_quiz_topics():
    rows = get_db().execute(
        'SELECT t.id, t.title, COUNT(q.id) AS question_count FROM topics t '
        'LEFT JOIN questions q ON q.topic_id = t.id WHERE t.owner_id IS NULL '
        'GROUP BY t.id ORDER BY t.id'
    ).fetchall()
    return ok({'topics': [{'id': row['id'], 'title': row['title'], 'questionCount': row['question_count']} for row in rows],
               'quizSize': QUIZ_SIZE})


@bp.get('/api/admin/topics/<int:topic_id>/questions')
@admin_required
def admin_topic_questions(topic_id):
    db = get_db()
    topic = db.execute('SELECT id, title FROM topics WHERE id = ? AND owner_id IS NULL', (topic_id,)).fetchone()
    if topic is None:
        return error('Topic not found', 404)
    rows = db.execute('SELECT * FROM questions WHERE topic_id = ? ORDER BY id', (topic_id,)).fetchall()
    return ok({'topic': {'id': topic['id'], 'title': topic['title'], 'questionCount': len(rows)},
               'questions': [admin_view(row) for row in rows], 'quizSize': QUIZ_SIZE})


@bp.post('/api/admin/questions')
@admin_required
def create_question():
    body = request.get_json(silent=True) or {}
    topic_id, text, options = pick(body, 'topicId'), body.get('text'), body.get('options')
    answer_index, explanation = pick(body, 'answerIndex'), body.get('explanation')
    problem = validate_question(topic_id, text, options, answer_index, explanation)
    if problem:
        return error(problem, 400)
    db = get_db()
    if db.execute('SELECT 1 FROM topics WHERE id = ? AND owner_id IS NULL', (topic_id,)).fetchone() is None:
        return error('Official topic not found', 404)
    cursor = db.execute('INSERT INTO questions (topic_id, text, options, answer_index, explanation) VALUES (?, ?, ?, ?, ?)',
                        (topic_id, text.strip(), json.dumps(options), answer_index, explanation.strip()))
    db.commit()
    return ok(admin_view(db.execute('SELECT * FROM questions WHERE id = ?', (cursor.lastrowid,)).fetchone()), 201)


@bp.put('/api/admin/questions/<int:question_id>')
@admin_required
def update_question(question_id):
    db = get_db()
    row = db.execute('SELECT * FROM questions WHERE id = ?', (question_id,)).fetchone()
    if row is None:
        return error('Question not found', 404)
    current = admin_view(row)
    body = request.get_json(silent=True) or {}
    supplied = {key: pick(body, key) for key in ('topicId', 'text', 'options', 'answerIndex', 'explanation')}
    defaults = {'topicId': current['topicId'], 'text': current['text'], 'options': current['options'],
                'answerIndex': current['answerIndex'], 'explanation': current['explanation']}
    merged = {key: defaults[key] if value is _MISSING else value for key, value in supplied.items()}
    problem = validate_question(*(merged[key] for key in ('topicId', 'text', 'options', 'answerIndex', 'explanation')))
    if problem:
        return error(problem, 400)
    if db.execute('SELECT 1 FROM topics WHERE id = ? AND owner_id IS NULL', (merged['topicId'],)).fetchone() is None:
        return error('Official topic not found', 404)
    db.execute('UPDATE questions SET topic_id=?, text=?, options=?, answer_index=?, explanation=? WHERE id=?',
               (merged['topicId'], merged['text'].strip(), json.dumps(merged['options']), merged['answerIndex'],
                merged['explanation'].strip(), question_id))
    db.commit()
    return ok(admin_view(db.execute('SELECT * FROM questions WHERE id = ?', (question_id,)).fetchone()))


@bp.delete('/api/admin/questions/<int:question_id>')
@admin_required
def delete_question(question_id):
    db = get_db()
    cursor = db.execute('DELETE FROM questions WHERE id = ? AND topic_id IN (SELECT id FROM topics WHERE owner_id IS NULL)',
                        (question_id,))
    db.commit()
    if cursor.rowcount == 0:
        return error('Question not found', 404)
    return ok({'message': 'Question deleted'})


@bp.get('/api/my/quizzes')
@login_required
def my_quizzes():
    rows = get_db().execute(
        'SELECT t.id, t.title, COUNT(q.id) AS question_count FROM topics t '
        'LEFT JOIN questions q ON q.topic_id=t.id WHERE t.owner_id=? GROUP BY t.id ORDER BY t.id',
        (session['user_id'],),
    ).fetchall()
    return ok([{'id': row['id'], 'title': row['title'], 'questionCount': row['question_count']} for row in rows])


@bp.post('/api/my/quizzes')
@login_required
def create_my_quiz():
    body = request.get_json(silent=True) or {}
    title = body.get('title')
    if not isinstance(title, str) or not title.strip() or len(title.strip()) > MAX_TITLE_LEN:
        return error(f'title is required (max {MAX_TITLE_LEN} characters)', 400)
    db = get_db()
    user_id = session['user_id']
    if db.execute('SELECT COUNT(*) AS n FROM topics WHERE owner_id=?', (user_id,)).fetchone()['n'] >= MAX_MY_QUIZZES:
        return error(f'You can have at most {MAX_MY_QUIZZES} quizzes', 409)
    cursor = db.execute('INSERT INTO topics (title, owner_id, is_public) VALUES (?, ?, 0)', (title.strip(), user_id))
    db.commit()
    return ok({'id': cursor.lastrowid, 'title': title.strip(), 'questionCount': 0}, 201)


@bp.put('/api/my/quizzes/<int:quiz_id>')
@login_required
def rename_my_quiz(quiz_id):
    body = request.get_json(silent=True) or {}
    title = body.get('title')
    if not isinstance(title, str) or not title.strip() or len(title.strip()) > MAX_TITLE_LEN:
        return error(f'title is required (max {MAX_TITLE_LEN} characters)', 400)
    db = get_db()
    if own_topic(db, quiz_id, session['user_id']) is None:
        return error('Quiz not found', 404)
    db.execute('UPDATE topics SET title=? WHERE id=? AND owner_id=?', (title.strip(), quiz_id, session['user_id']))
    db.commit()
    return ok({'id': quiz_id, 'title': title.strip()})


@bp.delete('/api/my/quizzes/<int:quiz_id>')
@login_required
def delete_my_quiz(quiz_id):
    db = get_db()
    if own_topic(db, quiz_id, session['user_id']) is None:
        return error('Quiz not found', 404)
    db.execute('DELETE FROM questions WHERE topic_id=?', (quiz_id,))
    db.execute('DELETE FROM topics WHERE id=? AND owner_id=?', (quiz_id, session['user_id']))
    db.commit()
    return ok({'message': 'Quiz deleted'})


@bp.get('/api/my/quizzes/<int:quiz_id>/questions')
@login_required
def my_quiz_questions(quiz_id):
    db = get_db()
    topic = own_topic(db, quiz_id, session['user_id'])
    if topic is None:
        return error('Quiz not found', 404)
    rows = db.execute('SELECT * FROM questions WHERE topic_id=? ORDER BY id', (quiz_id,)).fetchall()
    return ok({'quiz': {'id': topic['id'], 'title': topic['title']}, 'questions': [admin_view(row) for row in rows]})


@bp.post('/api/my/quizzes/<int:quiz_id>/questions')
@login_required
def add_my_question(quiz_id):
    db = get_db()
    if own_topic(db, quiz_id, session['user_id']) is None:
        return error('Quiz not found', 404)
    body = request.get_json(silent=True) or {}
    text, options, answer_index = body.get('text'), body.get('options'), pick(body, 'answerIndex')
    explanation = body.get('explanation')
    if explanation is None or isinstance(explanation, str) and not explanation.strip():
        explanation = DEFAULT_EXPLANATION
    problem = validate_question(quiz_id, text, options, answer_index, explanation)
    if problem:
        return error(problem, 400)
    count = db.execute('SELECT COUNT(*) AS n FROM questions WHERE topic_id=?', (quiz_id,)).fetchone()['n']
    if count >= MAX_QUESTIONS_PER_MY_QUIZ:
        return error(f'A quiz can have at most {MAX_QUESTIONS_PER_MY_QUIZ} questions', 409)
    cursor = db.execute('INSERT INTO questions (topic_id,text,options,answer_index,explanation) VALUES (?,?,?,?,?)',
                        (quiz_id, text.strip(), json.dumps(options), answer_index, explanation.strip()))
    db.commit()
    return ok(admin_view(db.execute('SELECT * FROM questions WHERE id=?', (cursor.lastrowid,)).fetchone()), 201)


@bp.put('/api/my/questions/<int:question_id>')
@login_required
def update_my_question(question_id):
    db = get_db()
    row = db.execute('SELECT q.* FROM questions q JOIN topics t ON t.id=q.topic_id WHERE q.id=? AND t.owner_id=?',
                     (question_id, session['user_id'])).fetchone()
    if row is None:
        return error('Question not found', 404)
    current = admin_view(row)
    body = request.get_json(silent=True) or {}
    supplied = {key: pick(body, key) for key in ('text', 'options', 'answerIndex', 'explanation')}
    defaults = {'text': current['text'], 'options': current['options'], 'answerIndex': current['answerIndex'],
                'explanation': current['explanation']}
    merged = {key: defaults[key] if value is _MISSING else value for key, value in supplied.items()}
    if isinstance(merged['explanation'], str) and not merged['explanation'].strip():
        merged['explanation'] = DEFAULT_EXPLANATION
    problem = validate_question(row['topic_id'], merged['text'], merged['options'], merged['answerIndex'], merged['explanation'])
    if problem:
        return error(problem, 400)
    db.execute('UPDATE questions SET text=?,options=?,answer_index=?,explanation=? WHERE id=?',
               (merged['text'].strip(), json.dumps(merged['options']), merged['answerIndex'], merged['explanation'].strip(), question_id))
    db.commit()
    return ok(admin_view(db.execute('SELECT * FROM questions WHERE id=?', (question_id,)).fetchone()))


@bp.delete('/api/my/questions/<int:question_id>')
@login_required
def delete_my_question(question_id):
    db = get_db()
    cursor = db.execute('DELETE FROM questions WHERE id=? AND topic_id IN (SELECT id FROM topics WHERE owner_id=?)',
                        (question_id, session['user_id']))
    db.commit()
    if cursor.rowcount == 0:
        return error('Question not found', 404)
    return ok({'message': 'Question deleted'})
