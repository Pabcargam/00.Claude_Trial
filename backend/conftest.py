"""Fixtures shared by every app's tests."""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from accounts.tests.factories import UserFactory


@pytest.fixture(autouse=True)
def _clear_cache():
    """Throttle counters live in the cache; start every test from zero."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def auth_client(user):
    """An APIClient authenticated as `user` (bypasses JWT; JWT itself is tested in accounts)."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client
