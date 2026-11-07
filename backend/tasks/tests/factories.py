import factory

from accounts.tests.factories import UserFactory
from tasks.models import Priority, Task


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    owner = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f"Task {n}")
    priority = Priority.MEDIUM
