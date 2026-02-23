"""
SikshyaMap AI - Flask Application Factory.
"""

from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config

from app.models import db


jwt = JWTManager()


def create_app(config_name=Config):
    app = Flask(__name__)
    app.config.from_object(config_name)
    app.url_map.strict_slashes = False
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)

    from app.routes.auth import auth_bp
    from app.routes.concepts import concepts_bp
    from app.routes.problems import problems_bp
    from app.routes.sessions import sessions_bp
    from app.routes.resources import resources_bp
    from app.routes.diagnose import diagnose_bp
    from app.routes.progress import progress_bp
    from app.routes.simulations import simulations_bp
    from app.routes.students import student_bp
    from app.routes.sikshya import sikshya_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(concepts_bp, url_prefix="/api/concepts")
    app.register_blueprint(problems_bp, url_prefix="/api/problems")
    app.register_blueprint(sessions_bp, url_prefix="/api/sessions")
    app.register_blueprint(resources_bp, url_prefix="/api/resources")
    app.register_blueprint(diagnose_bp, url_prefix="/api/diagnose")
    app.register_blueprint(progress_bp, url_prefix="/api/progress")
    app.register_blueprint(simulations_bp, url_prefix="/api/simulations")
    app.register_blueprint(student_bp, url_prefix="/api/students")
    app.register_blueprint(sikshya_bp, url_prefix="/api/sikshya")

    with app.app_context():
        db.create_all()

    return app
