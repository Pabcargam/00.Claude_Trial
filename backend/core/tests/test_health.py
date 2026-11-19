import os
from unittest import mock

import pytest
from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APIClient

URL = reverse("core:health")


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
def test_health_ok_when_all_dependencies_are_up(client):
    response = client.get(URL)

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok", "cache": "ok"}


@pytest.mark.django_db
def test_health_is_public(client):
    """No credentials needed: Docker and load balancers call it anonymously."""
    response = client.get(URL, HTTP_AUTHORIZATION="Bearer invalid-token")

    assert response.status_code == 200


@pytest.mark.django_db
def test_health_reports_database_failure(client):
    with mock.patch("core.views.connection.cursor", side_effect=RuntimeError("db down")):
        response = client.get(URL)

    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "database": "error", "cache": "ok"}


@pytest.mark.django_db
def test_health_reports_cache_failure(client):
    with mock.patch("core.views.cache.set", side_effect=ConnectionError("redis down")):
        response = client.get(URL)

    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "database": "ok", "cache": "error"}


@pytest.mark.django_db
def test_health_reports_cache_returning_wrong_value(client):
    with mock.patch("core.views.cache.get", return_value=None):
        response = client.get(URL)

    assert response.status_code == 503
    assert response.json()["cache"] == "error"


@pytest.mark.django_db
def test_health_rejects_write_methods(client):
    response = client.post(URL)

    assert response.status_code == 405


@pytest.mark.django_db
def test_openapi_schema_is_served(client):
    response = client.get(reverse("schema"))

    assert response.status_code == 200
    assert b"/api/v1/health/" in response.content


def test_openapi_schema_generates_without_warnings():
    """Fails on any drf-spectacular warning (the CI deploy check would too)."""
    call_command("spectacular", "--validate", "--fail-on-warn", "--file", os.devnull)
