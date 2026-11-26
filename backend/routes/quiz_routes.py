# Owner: Fhil
from flask import Blueprint, jsonify
from ..auth import admin_required

bp = Blueprint('quiz', __name__)

def todo(): return jsonify(success=False, message='TODO'), 501

@bp.get('/api/topics/<int:topic_id>/questions')
def questions(topic_id: int): return todo()
@bp.post('/api/quiz/submit')
def submit(): return todo()
@bp.post('/api/admin/questions')
@admin_required
def create_question(): return todo()
@bp.put('/api/admin/questions/<int:question_id>')
@admin_required
def update_question(question_id: int): return todo()
@bp.delete('/api/admin/questions/<int:question_id>')
@admin_required
def delete_question(question_id: int): return todo()
