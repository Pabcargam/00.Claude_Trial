import factory
from django.contrib.auth import get_user_model

DEFAULT_PASSWORD = "Str0ng-test-pass!"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = get_user_model()

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = "Test"
    last_name = factory.Sequence(lambda n: f"User{n}")
    password = factory.django.Password(DEFAULT_PASSWORD)
