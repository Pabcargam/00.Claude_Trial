import datetime as dt

import pytest

from tasks.models import Priority, Task

from .factories import TaskFactory

pytestmark = pytest.mark.django_db


def test_new_task_defaults():
    task = TaskFactory()

    assert task.priority == Priority.MEDIUM
    assert task.is_completed is False
    assert task.completed_at is None
    assert task.is_outdoor is False
    assert str(task) == task.title


def test_completing_sets_completed_at_once():
    task = TaskFactory()

    task.is_completed = True
    task.save()
    first = task.completed_at
    task.title = "renamed"
    task.save()

    assert first is not None
    assert task.completed_at == first  # not bumped by unrelated saves


def test_reopening_clears_completed_at():
    task = TaskFactory(is_completed=True)
    assert task.completed_at is not None

    task.is_completed = False
    task.save()

    assert task.completed_at is None


def test_update_fields_with_is_completed_also_persists_completed_at():
    task = TaskFactory()

    task.is_completed = True
    task.save(update_fields=["is_completed"])

    task.refresh_from_db()
    assert task.completed_at is not None


def test_default_ordering_open_then_priority_then_due_date(user):
    done_urgent = TaskFactory(owner=user, priority=Priority.URGENT, is_completed=True)
    low = TaskFactory(owner=user, priority=Priority.LOW)
    high_no_due = TaskFactory(owner=user, priority=Priority.HIGH)
    high_due_later = TaskFactory(owner=user, priority=Priority.HIGH, due_date=dt.date(2030, 1, 2))
    high_due_soon = TaskFactory(owner=user, priority=Priority.HIGH, due_date=dt.date(2030, 1, 1))

    assert list(Task.objects.filter(owner=user)) == [
        high_due_soon,
        high_due_later,
        high_no_due,
        low,
        done_urgent,
    ]
