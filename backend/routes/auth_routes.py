from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from ..auth import error, login_required
from ..db import get_db

bp = Blueprint('auth', __name__)


def public_user(row):
    return {'id': row['id'], 'username': row['username'], 'role': row['role'], 'points': row['points'], 'avatarColor': row['avatar_color']}


@bp.post('/api/login')
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username')
    password = data.get('password')
    if not isinstance(username, str) or not username.strip() or not isinstance(password, str) or not password:
        return error('Username and password are required', 400)
    username = username.strip()
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if user is None:
        cursor = db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, generate_password_hash(password)))
        db.commit()
        user = db.execute('SELECT * FROM users WHERE id = ?', (cursor.lastrowid,)).fetchone()
    elif not check_password_hash(user['password_hash'], password):
        return error('Invalid username or password', 401)
    session.clear()
    session['user_id'] = user['id']
    return jsonify(success=True, data=public_user(user))


@bp.post('/api/logout')
def logout():
    session.clear()
    return jsonify(success=True, message='Logged out')


@bp.get('/api/me')
@login_required
def me():
    row = get_db().execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    if row is None:
        session.clear()
        return error('Authentication required', 401)
    return jsonify(success=True, data=public_user(row))
