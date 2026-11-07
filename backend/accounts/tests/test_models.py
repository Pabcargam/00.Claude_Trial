import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()

pytestmark = pytest.mark.django_db


def test_create_user_uses_email_as_login():
    user = User.objects.create_user(email="  Pablo@Example.COM ", password="s3cret-pass")

    assert user.email == "pablo@example.com"  # trimmed and fully lowercased
    assert user.check_password("s3cret-pass")
    assert not user.is_staff
    assert not user.is_superuser
    assert User.USERNAME_FIELD == "email"
    assert str(user) == "pablo@example.com"


def test_user_has_no_username_field():
    user = User.objects.create_user(email="a@example.com", password="x")

    assert not hasattr(user, "username") or user.username is None


def test_create_user_without_email_fails():
    with pytest.raises(ValueError, match="email"):
        User.objects.create_user(email="", password="x")


def test_email_must_be_unique():
    User.objects.create_user(email="dup@example.com", password="x")

    with pytest.raises(IntegrityError):
        User.objects.create_user(email="dup@example.com", password="y")


def test_create_superuser():
    admin = User.objects.create_superuser(email="admin@example.com", password="x")

    assert admin.is_staff
    assert admin.is_superuser


@pytest.mark.parametrize("flag", ["is_staff", "is_superuser"])
def test_create_superuser_rejects_disabled_flags(flag):
    with pytest.raises(ValueError, match=flag):
        User.objects.create_superuser(email="admin@example.com", password="x", **{flag: False})


def test_natural_key_lookup_is_case_insensitive():
    user = User.objects.create_user(email="mixed@example.com", password="x")

    assert User.objects.get_by_natural_key("MIXED@Example.com") == user


def test_emails_differing_only_in_case_are_the_same_account():
    User.objects.create_user(email="same@example.com", password="x")

    with pytest.raises(IntegrityError):
        User.objects.create_user(email="SAME@example.com", password="y")
