# Owner: Hazel
from flask import Blueprint, jsonify
from ..auth import admin_required

bp = Blueprint('lessons', __name__)


def todo():
    return jsonify(success=False, message='TODO'), 501

@bp.get('/api/topics')
def topics(): return todo()
@bp.get('/api/topics/<int:topic_id>/lessons')
def lessons(topic_id: int): return todo()
@bp.post('/api/admin/topics')
@admin_required
def create_topic(): return todo()
@bp.put('/api/admin/topics/<int:topic_id>')
@admin_required
def update_topic(topic_id: int): return todo()
@bp.delete('/api/admin/topics/<int:topic_id>')
@admin_required
def delete_topic(topic_id: int): return todo()
@bp.post('/api/admin/lessons')
@admin_required
def create_lesson(): return todo()
@bp.put('/api/admin/lessons/<int:lesson_id>')
@admin_required
def update_lesson(lesson_id: int): return todo()
@bp.delete('/api/admin/lessons/<int:lesson_id>')
@admin_required
def delete_lesson(lesson_id: int): return todo()
