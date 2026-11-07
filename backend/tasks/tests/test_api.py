import datetime as dt

import pytest
from django.urls import reverse

from accounts.tests.factories import UserFactory
from tasks.models import Priority, Task

from .factories import TaskFactory

pytestmark = pytest.mark.django_db

LIST = reverse("tasks:task-list")


def detail(task_id):
    return reverse("tasks:task-detail", args=[task_id])


def titles(response):
    return [t["title"] for t in response.json()["results"]]


# --- auth ------------------------------------------------------------------------


@pytest.mark.parametrize("method", ["get", "post"])
def test_list_and_create_require_authentication(api_client, method):
    assert getattr(api_client, method)(LIST).status_code == 401


def test_detail_requires_authentication(api_client):
    task = TaskFactory()

    assert api_client.get(detail(task.id)).status_code == 401


# --- create ----------------------------------------------------------------------


def test_create_task_with_all_fields(auth_client, user):
    response = auth_client.post(
        LIST,
        {
            "title": "  Mow the lawn  ",
            "description": "Front and back",
            "priority": "high",
            "due_date": "2030-05-01",
            "is_outdoor": True,
        },
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Mow the lawn"
    assert body["priority"] == "HIGH"
    assert body["due_date"] == "2030-05-01"
    assert body["is_outdoor"] is True
    assert body["is_completed"] is False
    assert body["completed_at"] is None
    task = Task.objects.get(id=body["id"])
    assert task.owner == user
    assert task.priority == Priority.HIGH


def test_create_defaults_to_medium_priority(auth_client):
    response = auth_client.post(LIST, {"title": "Call mum"}, format="json")

    assert response.status_code == 201
    assert response.json()["priority"] == "MEDIUM"


def test_owner_in_payload_is_ignored(auth_client, user):
    other = UserFactory()

    response = auth_client.post(LIST, {"title": "Mine", "owner": other.id}, format="json")

    assert Task.objects.get(id=response.json()["id"]).owner == user
    assert "owner" not in response.json()


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({}, "title"),
        ({"title": "   "}, "title"),
        ({"title": "x" * 201}, "title"),
        ({"title": "ok", "priority": "CRITICAL"}, "priority"),
        ({"title": "ok", "priority": 4}, "priority"),
        ({"title": "ok", "due_date": "tomorrow"}, "due_date"),
    ],
    ids=["missing", "blank", "too-long", "unknown-priority", "numeric-priority", "bad-date"],
)
def test_create_validation(auth_client, payload, field):
    response = auth_client.post(LIST, payload, format="json")

    assert response.status_code == 400
    assert field in response.json()


# --- read --------------------------------------------------------------------------


def test_list_returns_only_own_tasks(auth_client, user):
    TaskFactory(owner=user, title="mine")
    TaskFactory(title="someone else's")

    response = auth_client.get(LIST)

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert titles(response) == ["mine"]


def test_retrieve_own_task(auth_client, user):
    task = TaskFactory(owner=user, priority=Priority.URGENT)

    response = auth_client.get(detail(task.id))

    assert response.status_code == 200
    assert response.json()["priority"] == "URGENT"


# --- isolation: other users' tasks are invisible -----------------------------------


@pytest.mark.parametrize(
    ("method", "payload"),
    [("get", None), ("patch", {"title": "hacked"}), ("delete", None)],
)
def test_cannot_touch_another_users_task(auth_client, method, payload):
    foreign = TaskFactory(title="private")

    response = getattr(auth_client, method)(detail(foreign.id), payload, format="json")

    assert response.status_code == 404
    foreign.refresh_from_db()
    assert foreign.title == "private"


# --- update ------------------------------------------------------------------------


def test_patch_text_and_priority(auth_client, user):
    task = TaskFactory(owner=user)

    response = auth_client.patch(
        detail(task.id), {"title": "New title", "priority": "LOW"}, format="json"
    )

    assert response.status_code == 200
    task.refresh_from_db()
    assert task.title == "New title"
    assert task.priority == Priority.LOW


def test_complete_and_reopen_task(auth_client, user):
    task = TaskFactory(owner=user)

    done = auth_client.patch(detail(task.id), {"is_completed": True}, format="json").json()
    reopened = auth_client.patch(detail(task.id), {"is_completed": False}, format="json").json()

    assert done["is_completed"] is True
    assert done["completed_at"] is not None
    assert reopened["is_completed"] is False
    assert reopened["completed_at"] is None


def test_read_only_fields_cannot_be_written(auth_client, user):
    task = TaskFactory(owner=user)

    auth_client.patch(
        detail(task.id),
        {"completed_at": "2020-01-01T00:00:00Z", "created_at": "2020-01-01T00:00:00Z"},
        format="json",
    )

    task.refresh_from_db()
    assert task.completed_at is None
    assert task.created_at.year != 2020


def test_put_is_not_allowed(auth_client, user):
    task = TaskFactory(owner=user)

    response = auth_client.put(detail(task.id), {"title": "x"}, format="json")

    assert response.status_code == 405


# --- delete --------------------------------------------------------------------------


def test_delete_own_task(auth_client, user):
    task = TaskFactory(owner=user)

    response = auth_client.delete(detail(task.id))

    assert response.status_code == 204
    assert not Task.objects.filter(id=task.id).exists()


def test_deleting_user_deletes_their_tasks(user):
    TaskFactory.create_batch(2, owner=user)

    user.delete()

    assert Task.objects.count() == 0


# --- filters, search, ordering, pagination -----------------------------------------------


@pytest.fixture
def mixed_tasks(user):
    return {
        "low": TaskFactory(owner=user, title="Buy milk", priority=Priority.LOW),
        "high": TaskFactory(
            owner=user,
            title="Paint fence",
            priority=Priority.HIGH,
            is_outdoor=True,
            due_date=dt.date(2030, 6, 10),
        ),
        "urgent_done": TaskFactory(
            owner=user, title="Pay rent", priority=Priority.URGENT, is_completed=True
        ),
        "medium": TaskFactory(
            owner=user,
            title="Clean garage",
            description="paint cans too",
            due_date=dt.date(2030, 6, 1),
        ),
    }


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ("priority=HIGH", {"Paint fence"}),
        ("priority=high&priority=URGENT", {"Paint fence", "Pay rent"}),
        ("completed=true", {"Pay rent"}),
        ("completed=false", {"Buy milk", "Paint fence", "Clean garage"}),
        ("is_outdoor=true", {"Paint fence"}),
        ("due_after=2030-06-05", {"Paint fence"}),
        ("due_before=2030-06-05", {"Clean garage"}),
        ("search=paint", {"Paint fence", "Clean garage"}),  # title or description
    ],
)
def test_filters_and_search(auth_client, mixed_tasks, query, expected):
    response = auth_client.get(f"{LIST}?{query}")

    assert response.status_code == 200
    assert set(titles(response)) == expected


def test_unknown_priority_filter_is_rejected(auth_client):
    response = auth_client.get(f"{LIST}?priority=CRITICAL")

    assert response.status_code == 400


def test_default_order_is_open_then_most_urgent(auth_client, mixed_tasks):
    response = auth_client.get(LIST)

    assert titles(response) == ["Paint fence", "Clean garage", "Buy milk", "Pay rent"]


def test_ordering_by_priority_is_numeric_not_alphabetical(auth_client, mixed_tasks):
    response = auth_client.get(f"{LIST}?ordering=-priority")

    assert titles(response) == ["Pay rent", "Paint fence", "Clean garage", "Buy milk"]


def test_pagination(auth_client, user):
    TaskFactory.create_batch(5, owner=user)

    response = auth_client.get(f"{LIST}?page_size=2&page=2")

    body = response.json()
    assert body["count"] == 5
    assert len(body["results"]) == 2
    assert body["next"] is not None
    assert body["previous"] is not None
