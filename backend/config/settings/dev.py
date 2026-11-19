"""Local development settings (used by `docker compose up` and `manage.py` by default)."""

from .base import *  # noqa: F403
from .base import REST_FRAMEWORK

DEBUG = True

# The browsable API is handy while developing; production only renders JSON.
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]
