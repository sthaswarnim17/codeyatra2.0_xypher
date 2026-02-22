#!/usr/bin/env python
"""
Aarvana — Application entry point.
Uses the factory in app/__init__.py to create and run the Flask app.
"""

import os
from app import create_app

app = create_app(os.getenv("FLASK_CONFIG", "default"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5001)), debug=True)