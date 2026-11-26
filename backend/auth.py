from functools import wraps
from flask import jsonify, session
from .db import get_db


def error(message: str, status: int):
    return jsonify(success=False, message=message), status


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if session.get('user_id') is None:
            return error('Authentication required', 401)
        return view(*args, **kwargs)
    return wrapped


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user_id = session.get('user_id')
        if user_id is None:
            return error('Authentication required', 401)
        row = get_db().execute('SELECT role FROM users WHERE id = ?', (user_id,)).fetchone()
        if row is None or row['role'] != 'admin':
            return error('Admin access required', 403)
        return view(*args, **kwargs)
    return wrapped
