import json
import os
from werkzeug.security import generate_password_hash
from .app import create_app
from .db import get_db
from .question_bank import QUESTION_BANK

app = create_app()

TOPIC_TITLES = ['Arrays', 'Trees', 'Searching and Sorting', 'Linked Lists', 'Stack', 'Queue']

with app.app_context():
    db = get_db()
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin-dev-password')
    db.execute(
        'INSERT OR IGNORE INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)',
        ('admin', generate_password_hash(admin_password), 'admin'),
    )

    db.execute(
        "UPDATE topics SET title = 'Searching and Sorting' WHERE title = 'Searching' AND owner_id IS NULL "
        "AND NOT EXISTS (SELECT 1 FROM topics WHERE title = 'Searching and Sorting')"
    )
    for title in TOPIC_TITLES:
        db.execute(
            'INSERT INTO topics (title, owner_id, is_public) SELECT ?, NULL, 1 '
            'WHERE NOT EXISTS (SELECT 1 FROM topics WHERE title = ? AND owner_id IS NULL)',
            (title, title),
        )
    placeholders = ','.join('?' * len(TOPIC_TITLES))
    topic_rows = db.execute(
        f'SELECT id, title FROM topics WHERE owner_id IS NULL AND title IN ({placeholders})', TOPIC_TITLES
    ).fetchall()

    lesson_content = {
        'Arrays': [('What is an array?', 'An array stores values in order.'), ('Indexing', 'An index identifies a position in an array.')],
        'Searching and Sorting': [('Linear search', 'Linear search checks items one at a time.'), ('Binary search', 'Binary search halves a sorted search range.')],
    }
    question_content = QUESTION_BANK
    for topic in topic_rows:
        title = topic['title']
        for order_no, (lesson_title, content) in enumerate(lesson_content.get(title, []), start=1):
            db.execute('INSERT OR IGNORE INTO lessons (topic_id, title, content, order_no) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE topic_id = ? AND title = ?)', (topic['id'], lesson_title, content, order_no, topic['id'], lesson_title))
        for text, options, answer, explanation in question_content.get(title, []):
            db.execute('INSERT OR IGNORE INTO questions (topic_id, text, options, answer_index, explanation) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM questions WHERE topic_id = ? AND text = ?)', (topic['id'], text, json.dumps(options), answer, explanation, topic['id'], text))
    for name, cost in [('Snack', 20), ('Drink', 15), ('Lunch', 30), ('Cake', 25)]:
        db.execute('INSERT OR IGNORE INTO items (name, cost) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = ?)', (name, cost, name))
    db.commit()
