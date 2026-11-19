import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from .factories import DEFAULT_PASSWORD, UserFactory

User = get_user_model()

pytestmark = pytest.mark.django_db

REGISTER = reverse("accounts:register")
TOKEN = reverse("accounts:token")
REFRESH = reverse("accounts:token-refresh")
LOGOUT = reverse("accounts:logout")
ME = reverse("accounts:me")


def login(client, email, password=DEFAULT_PASSWORD):
    return client.post(TOKEN, {"email": email, "password": password}, format="json")


# --- register ----------------------------------------------------------------


def test_register_creates_user_and_hides_password(api_client):
    response = api_client.post(
        REGISTER,
        {"email": "New@Example.com", "password": "Sup3r-secret!", "first_name": "Ana"},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["first_name"] == "Ana"
    assert "password" not in body
    assert User.objects.get(email="new@example.com").check_password("Sup3r-secret!")


def test_register_rejects_existing_email_in_any_case(api_client):
    UserFactory(email="taken@example.com")

    response = api_client.post(
        REGISTER, {"email": "TAKEN@example.com", "password": "Sup3r-secret!"}, format="json"
    )

    assert response.status_code == 400
    assert "email" in response.json()


@pytest.mark.parametrize(
    "password",
    ["short", "12345678901", "password123"],
    ids=["too-short", "numeric", "common"],
)
def test_register_rejects_weak_passwords(api_client, password):
    response = api_client.post(
        REGISTER, {"email": "weak@example.com", "password": password}, format="json"
    )

    assert response.status_code == 400
    assert not User.objects.filter(email="weak@example.com").exists()


def test_register_rejects_password_similar_to_email(api_client):
    response = api_client.post(
        REGISTER,
        {"email": "verylongname@example.com", "password": "verylongname"},
        format="json",
    )

    assert response.status_code == 400


def test_register_requires_email_and_password(api_client):
    response = api_client.post(REGISTER, {}, format="json")

    assert response.status_code == 400
    assert set(response.json()) >= {"email", "password"}


# --- login / refresh ---------------------------------------------------------


def test_login_returns_access_and_refresh_tokens(api_client, user):
    response = login(api_client, user.email)

    assert response.status_code == 200
    assert set(response.json()) == {"access", "refresh"}


def test_login_is_case_insensitive_on_email(api_client, user):
    response = login(api_client, user.email.upper())

    assert response.status_code == 200


def test_login_with_wrong_password_fails(api_client, user):
    response = login(api_client, user.email, "wrong-password")

    assert response.status_code == 401


def test_inactive_user_cannot_log_in(api_client):
    user = UserFactory(is_active=False)

    assert login(api_client, user.email).status_code == 401


def test_refresh_rotates_and_blacklists_old_token(api_client, user):
    old_refresh = login(api_client, user.email).json()["refresh"]

    response = api_client.post(REFRESH, {"refresh": old_refresh}, format="json")

    assert response.status_code == 200
    assert set(response.json()) == {"access", "refresh"}
    assert response.json()["refresh"] != old_refresh
    # The old refresh token was blacklisted by the rotation.
    reuse = api_client.post(REFRESH, {"refresh": old_refresh}, format="json")
    assert reuse.status_code == 401


# --- me ------------------------------------------------------------------------


def test_me_with_a_valid_access_token(api_client, user):
    access = login(api_client, user.email).json()["access"]

    response = api_client.get(ME, HTTP_AUTHORIZATION=f"Bearer {access}")

    assert response.status_code == 200
    assert response.json()["email"] == user.email
    assert "password" not in response.json()


def test_me_without_token_is_unauthorized(api_client):
    assert api_client.get(ME).status_code == 401


def test_me_with_garbage_token_is_unauthorized(api_client):
    response = api_client.get(ME, HTTP_AUTHORIZATION="Bearer not-a-jwt")

    assert response.status_code == 401


# --- logout --------------------------------------------------------------------


def test_logout_blacklists_refresh_token(api_client, user):
    refresh = login(api_client, user.email).json()["refresh"]

    response = api_client.post(LOGOUT, {"refresh": refresh}, format="json")

    assert response.status_code == 205
    assert api_client.post(REFRESH, {"refresh": refresh}, format="json").status_code == 401


def test_logout_twice_fails(api_client, user):
    refresh = login(api_client, user.email).json()["refresh"]
    api_client.post(LOGOUT, {"refresh": refresh}, format="json")

    response = api_client.post(LOGOUT, {"refresh": refresh}, format="json")

    assert response.status_code == 400


def test_logout_with_invalid_token_fails(api_client):
    response = api_client.post(LOGOUT, {"refresh": "garbage"}, format="json")

    assert response.status_code == 400


def test_logout_requires_refresh_field(api_client):
    assert api_client.post(LOGOUT, {}, format="json").status_code == 400


# --- throttling ----------------------------------------------------------------


def test_login_is_throttled_after_ten_attempts_per_minute(api_client, user):
    for _ in range(10):
        login(api_client, user.email, "wrong-password")

    response = login(api_client, user.email)

    assert response.status_code == 429


def test_register_is_throttled(api_client):
    for i in range(10):
        api_client.post(REGISTER, {"email": f"u{i}@example.com", "password": "x"}, format="json")

    response = api_client.post(
        REGISTER, {"email": "last@example.com", "password": "Sup3r-secret!"}, format="json"
    )

    assert response.status_code == 429
