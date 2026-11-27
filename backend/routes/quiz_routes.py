from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from ..auth import admin_required, error, login_required
from ..db import add_points, get_db

bp = Blueprint('quiz', __name__)
