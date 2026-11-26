import os
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
from .db import close_db, init_db
from .routes.auth_routes import bp as auth_bp
from .routes.lessons_routes import bp as lessons_bp
from .routes.quiz_routes import bp as quiz_bp
from .routes.canteen_routes import bp as canteen_bp


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-only-change-me'),
        DATABASE=os.environ.get('DATABASE', str(Path(__file__).with_name('game.db'))),
        DIST_DIR=str(Path(__file__).resolve().parent.parent / 'static' / 'dist'),
    )
    if test_config:
        app.config.update(test_config)
    app.register_blueprint(auth_bp)
    app.register_blueprint(lessons_bp)
    app.register_blueprint(quiz_bp)
    app.register_blueprint(canteen_bp)
    app.teardown_appcontext(close_db)

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify(success=False, message='Not found'), 404

    @app.get('/')
    def index():
        return send_from_directory(app.config['DIST_DIR'], 'index.html')

    @app.get('/admin')
    def admin_page():
        return send_from_directory(app.config['DIST_DIR'], 'admin.html')

    @app.get('/static/dist/<path:filename>')
    def built_assets(filename: str):
        return send_from_directory(app.config['DIST_DIR'], filename)

    @app.get('/assets/<path:filename>')
    def game_assets(filename: str):
        return send_from_directory(str(Path(app.config['DIST_DIR']) / 'assets'), filename)

    with app.app_context():
        init_db()
    return app


app = create_app()
