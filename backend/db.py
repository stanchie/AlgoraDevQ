import sqlite3
from pathlib import Path
from flask import current_app, g


def get_db() -> sqlite3.Connection:
    if 'db' not in g:
        g.db = sqlite3.connect(current_app.config['DATABASE'])
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


def close_db(_error: BaseException | None = None) -> None:
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db() -> None:
    db = get_db()
    schema = Path(__file__).with_name('schema.sql').read_text(encoding='utf-8')
    db.executescript(schema)

    # Migrate databases created before forced first-login admin credential changes.
    columns = {row['name'] for row in db.execute('PRAGMA table_info(users)').fetchall()}
    if 'must_change_password' not in columns:
        db.execute('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0')
        # Existing admins predate the change flow; require each to replace their credentials once.
        db.execute("UPDATE users SET must_change_password=1 WHERE role='admin'")
    db.commit()


def add_points(user_id: int, amount: int) -> int:
    db = get_db()
    db.execute('UPDATE users SET points = points + ? WHERE id = ?', (amount, user_id))
    db.commit()
    row = db.execute('SELECT points FROM users WHERE id = ?', (user_id,)).fetchone()
    return int(row['points']) if row else 0
