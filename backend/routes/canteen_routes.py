# Owner: Hazel
from flask import Blueprint, jsonify, session
from ..auth import admin_required, login_required
from ..db import get_db

bp = Blueprint('canteen', __name__)

def todo(): return jsonify(success=False, message='TODO'), 501

@bp.get('/api/canteen/items')
def items(): return todo()
@bp.post('/api/canteen/buy')
def buy(): return todo()
@bp.post('/api/admin/items')
@admin_required
def create_item(): return todo()
@bp.put('/api/admin/items/<int:item_id>')
@admin_required
def update_item(item_id: int): return todo()
@bp.delete('/api/admin/items/<int:item_id>')
@admin_required
def delete_item(item_id: int): return todo()
@bp.get('/api/points')
@login_required
def points():
    row = get_db().execute('SELECT points FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    if row is None:
        return jsonify(success=False, message='Authentication required'), 401
    return jsonify(success=True, data={'points': row['points']})
