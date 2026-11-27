import re
import sqlite3
from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from ..auth import admin_required, error, login_required
from ..db import get_db

bp = Blueprint('auth', __name__)


def public_user(row):
    return {
        'id': row['id'],
        'username': row['username'],
        'role': row['role'],
        'points': row['points'],
        'avatarColor': row['avatar_color'],
        'mustChangePassword': bool(row['must_change_password']),
    }


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


@bp.put('/api/admin/account')
@admin_required
def update_admin_account():
    data = request.get_json(silent=True) or {}
    current_password = data.get('currentPassword')
    username = data.get('username')
    new_password = data.get('newPassword')
    if not isinstance(current_password, str) or not current_password:
        return error('Current password is required', 400)
    if not isinstance(username, str) or not re.fullmatch(r'[A-Za-z0-9_]{3,32}', username.strip()):
        return error('Username must be 3–32 letters, numbers, or underscores', 400)
    username = username.strip()
    if not isinstance(new_password, str) or len(new_password) < 12:
        return error('Password must be at least 12 characters', 400)

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=? AND role='admin'", (session['user_id'],)).fetchone()
    if user is None or not check_password_hash(user['password_hash'], current_password):
        return error('Current password is incorrect', 401)
    try:
        db.execute(
            'UPDATE users SET username=?, password_hash=?, must_change_password=0 WHERE id=?',
            (username, generate_password_hash(new_password), user['id']),
        )
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        return error('That username is already taken', 409)

    updated = db.execute('SELECT * FROM users WHERE id=?', (user['id'],)).fetchone()
    return jsonify(success=True, data=public_user(updated))


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
