"""Vercel serverless entrypoint.

Vercel's Python runtime serves the ASGI ``app`` exposed here. The repo root is
added to sys.path so the ``app`` package imports the same way it does locally.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402,F401
