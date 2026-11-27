import hmac
import os
import sqlite3
from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from ..auth import error, login_required
from ..db import get_db

bp = Blueprint('auth', __name__)


def public_user(row):
    return {'id': row['id'], 'username': row['username'], 'role': row['role'], 'points': row['points'], 'avatarColor': row['avatar_color']}


@bp.post('/api/admin/register-first')
def register_first_admin():
    """One-time admin bootstrap protected by a server-side setup key."""
    setup_key = os.environ.get('ADMIN_SETUP_KEY')
    if not setup_key:
        return error('First-admin registration is not configured on this server', 503)

    data = request.get_json(silent=True) or {}
    supplied_key = data.get('setupKey')
    username = data.get('username')
    password = data.get('password')
    if not isinstance(supplied_key, str) or not hmac.compare_digest(supplied_key, setup_key):
        return error('Invalid setup key', 403)
    if not isinstance(username, str) or not 3 <= len(username.strip()) <= 32:
        return error('Username must be 3 to 32 characters', 400)
    username = username.strip()
    if not isinstance(password, str) or len(password) < 12:
        return error('Admin password must be at least 12 characters', 400)

    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").fetchone():
        return error('An admin account already exists; first-admin registration is closed', 409)
    try:
        cursor = db.execute(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            (username, generate_password_hash(password), 'admin'),
        )
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        return error('That username is already taken', 409)

    user = db.execute('SELECT * FROM users WHERE id = ?', (cursor.lastrowid,)).fetchone()
    session.clear()
    session['user_id'] = user['id']
    return jsonify(success=True, data=public_user(user)), 201


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
