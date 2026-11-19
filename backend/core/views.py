"""Health check used by Docker, CI and the frontend status badge."""

import logging

from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

HEALTH_CACHE_KEY = "health-check"
# Shared by every dependency check; named once in the OpenAPI schema (see ENUM_NAME_OVERRIDES).
DEPENDENCY_STATUS_CHOICES = ["ok", "error"]


def check_database() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        logger.exception("Health check: database unavailable")
        return False
    return True


def check_cache() -> bool:
    try:
        cache.set(HEALTH_CACHE_KEY, "ok", timeout=5)
        return cache.get(HEALTH_CACHE_KEY) == "ok"
    except Exception:
        logger.exception("Health check: cache unavailable")
        return False


class HealthView(APIView):
    """Report whether the API and its dependencies (database, cache) are reachable."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(
        responses={
            200: inline_serializer(
                name="HealthResponse",
                fields={
                    "status": serializers.ChoiceField(choices=["ok", "degraded"]),
                    "database": serializers.ChoiceField(choices=DEPENDENCY_STATUS_CHOICES),
                    "cache": serializers.ChoiceField(choices=DEPENDENCY_STATUS_CHOICES),
                },
            ),
            503: None,
        }
    )
    def get(self, request):
        checks = {"database": check_database(), "cache": check_cache()}
        healthy = all(checks.values())
        body = {"status": "ok" if healthy else "degraded"}
        body.update({name: "ok" if ok else "error" for name, ok in checks.items()})
        return Response(
            body,
            status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
