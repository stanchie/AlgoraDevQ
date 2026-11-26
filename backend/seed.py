import os
from werkzeug.security import generate_password_hash
from .app import create_app
from .db import get_db

app = create_app()

with app.app_context():
    db = get_db()
    db.execute(
        'INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ('admin', generate_password_hash(os.environ.get('ADMIN_PASSWORD', 'admin-dev-password')), 'admin'),
    )
    topics = [('Arrays',), ('Searching',)]
    for (title,) in topics:
        db.execute('INSERT OR IGNORE INTO topics (title, owner_id, is_public) VALUES (?, NULL, 1)', (title,))
    topic_rows = db.execute('SELECT id, title FROM topics WHERE title IN (?, ?)', ('Arrays', 'Searching')).fetchall()
    lesson_content = {
        'Arrays': [('What is an array?', 'An array stores values in order.'), ('Indexing', 'An index identifies a position in an array.')],
        'Searching': [('Linear search', 'Linear search checks items one at a time.'), ('Binary search', 'Binary search halves a sorted search range.')],
    }
    question_content = {
        'Arrays': [
            ('Where is the first array element?', ['Index 0', 'Index 1', 'The last index'], 0, 'Most arrays use zero-based indexing.'),
            ('What does an index identify?', ['A position', 'A color', 'A file'], 0, 'An index identifies a position.'),
            ('Which operation visits each value?', ['Traversal', 'Sorting', 'Painting'], 0, 'Traversal visits values in sequence.'),
        ],
        'Searching': [
            ('What does linear search do?', ['Checks items in sequence', 'Halves the list', 'Reverses values'], 0, 'Linear search checks items one at a time.'),
            ('Binary search needs what input?', ['Sorted data', 'A stack', 'A graph'], 0, 'Binary search works on sorted data.'),
            ('Which search halves its range?', ['Binary search', 'Linear search', 'Depth-first search'], 0, 'Binary search repeatedly halves the range.'),
        ],
    }
    for topic in topic_rows:
        title = topic['title']
        for order_no, (lesson_title, content) in enumerate(lesson_content[title], start=1):
            db.execute('INSERT OR IGNORE INTO lessons (topic_id, title, content, order_no) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE topic_id = ? AND title = ?)', (topic['id'], lesson_title, content, order_no, topic['id'], lesson_title))
        for text, options, answer, explanation in question_content[title]:
            db.execute('INSERT OR IGNORE INTO questions (topic_id, text, options, answer_index, explanation) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM questions WHERE topic_id = ? AND text = ?)', (topic['id'], text, __import__('json').dumps(options), answer, explanation, topic['id'], text))
    for name, cost in [('Snack', 20), ('Drink', 15), ('Lunch', 30), ('Cake', 25)]:
        db.execute('INSERT OR IGNORE INTO items (name, cost) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = ?)', (name, cost, name))
    db.commit()
