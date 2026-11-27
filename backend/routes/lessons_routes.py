from flask import Blueprint, jsonify, request, session
from ..auth import admin_required, error, login_required
from ..db import get_db

bp = Blueprint('lessons', __name__)


def todo():
    return jsonify(success=False, message='TODO'), 501


@bp.get('/api/topics')
@login_required
def topics():
    rows = get_db().execute(
        'SELECT id, title, owner_id, is_public FROM topics '
        'WHERE (owner_id IS NULL AND is_public=1) OR owner_id=? ORDER BY id',
        (session['user_id'],),
    ).fetchall()
    return jsonify(success=True, data=[{'id': row['id'], 'title': row['title'], 'ownerId': row['owner_id'],
                                        'isPublic': bool(row['is_public'])} for row in rows])


@bp.get('/api/topics/<int:topic_id>/lessons')
@login_required
def lessons(topic_id):
    db = get_db()
    visible = db.execute('SELECT 1 FROM topics WHERE id=? AND (owner_id IS NULL AND is_public=1 OR owner_id=?)',
                         (topic_id, session['user_id'])).fetchone()
    if visible is None:
        return error('Topic not found', 404)
    rows = db.execute('SELECT id, topic_id, title, content, order_no FROM lessons WHERE topic_id=? ORDER BY order_no, id',
                      (topic_id,)).fetchall()
    return jsonify(success=True, data=[{'id': row['id'], 'topicId': row['topic_id'], 'title': row['title'],
                                        'content': row['content'], 'orderNo': row['order_no']} for row in rows])


@bp.post('/api/admin/topics')
@admin_required
def create_topic(): return todo()
@bp.put('/api/admin/topics/<int:topic_id>')
@admin_required
def update_topic(topic_id): return todo()
@bp.delete('/api/admin/topics/<int:topic_id>')
@admin_required
def delete_topic(topic_id): return todo()
@bp.post('/api/admin/lessons')
@admin_required
def create_lesson(): return todo()
@bp.put('/api/admin/lessons/<int:lesson_id>')
@admin_required
def update_lesson(lesson_id): return todo()
@bp.delete('/api/admin/lessons/<int:lesson_id>')
@admin_required
def delete_lesson(lesson_id): return todo()
