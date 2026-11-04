"""Settings for the test suite.

Defaults let `pytest` run on a bare machine (SQLite in memory, local-memory
cache). CI overrides DATABASE_URL to run against PostgreSQL.
"""

import os

os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DATABASE_URL", "sqlite://:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from .base import *  # noqa: F403

DEBUG = False

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# Fast hashing keeps auth-heavy tests quick.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
