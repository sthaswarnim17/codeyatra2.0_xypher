#!/usr/bin/env python
"""
Aarvana — Application entry point.
Uses the factory in app/__init__.py to create and run the Flask app.
"""

from config import DevelopmentConfig
from app import create_app
import os

app = create_app(DevelopmentConfig)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True, use_reloader=False)
