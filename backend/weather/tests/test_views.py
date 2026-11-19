import pytest
from django.urls import reverse

from .payloads import GEOCODING_SEVILLE, forecast_payload

pytestmark = pytest.mark.django_db

LOCATIONS = reverse("weather:locations")
FORECAST = reverse("weather:forecast")


@pytest.mark.parametrize("url", [LOCATIONS, FORECAST])
def test_weather_requires_authentication(api_client, url):
    assert api_client.get(url).status_code == 401


# --- locations -------------------------------------------------------------------------


def test_locations_returns_normalised_list(auth_client, mock_open_meteo, geocoding_url):
    mock_open_meteo.get(geocoding_url, json=GEOCODING_SEVILLE)

    response = auth_client.get(LOCATIONS, {"q": "Sevil"})

    assert response.status_code == 200
    assert [loc["name"] for loc in response.json()] == ["Seville", "Sevilla"]


@pytest.mark.parametrize(
    "params", [{}, {"q": "S"}, {"q": "x" * 101}], ids=["missing", "1-char", "101-chars"]
)
def test_locations_query_validation(auth_client, mock_open_meteo, params):
    response = auth_client.get(LOCATIONS, params)

    assert response.status_code == 400
    assert "q" in response.json()
    assert len(mock_open_meteo.calls) == 0  # rejected before any upstream call


# --- forecast --------------------------------------------------------------------------


def test_forecast_response_shape(auth_client, mock_open_meteo, forecast_url):
    mock_open_meteo.get(forecast_url, json=forecast_payload())

    response = auth_client.get(FORECAST, {"lat": 37.38, "lon": -5.97, "days": 3})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"days", "location", "units", "current", "daily", "hourly"}
    assert body["days"] == 3
    assert len(body["daily"]) == 3
    assert len(body["hourly"]) == 72


def test_forecast_defaults_to_seven_days(auth_client, mock_open_meteo, forecast_url):
    mock_open_meteo.get(forecast_url, json=forecast_payload())

    response = auth_client.get(FORECAST, {"lat": 37.38, "lon": -5.97})

    assert response.json()["days"] == 7
    assert len(response.json()["daily"]) == 7


@pytest.mark.parametrize(
    ("params", "field"),
    [
        ({"lon": 0}, "lat"),
        ({"lat": 0}, "lon"),
        ({"lat": 91, "lon": 0}, "lat"),
        ({"lat": 0, "lon": -181}, "lon"),
        ({"lat": "north", "lon": 0}, "lat"),
        ({"lat": 0, "lon": 0, "days": 2}, "days"),
    ],
    ids=["no-lat", "no-lon", "lat-range", "lon-range", "lat-not-number", "days-not-allowed"],
)
def test_forecast_query_validation(auth_client, mock_open_meteo, params, field):
    response = auth_client.get(FORECAST, params)

    assert response.status_code == 400
    assert field in response.json()
    assert len(mock_open_meteo.calls) == 0


def test_upstream_outage_returns_503_with_friendly_message(
    auth_client, mock_open_meteo, forecast_url
):
    mock_open_meteo.get(forecast_url, status=500)

    response = auth_client.get(FORECAST, {"lat": 37.38, "lon": -5.97})

    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["detail"]


# --- throttling --------------------------------------------------------------------------


def test_weather_is_throttled_per_user(auth_client, mock_open_meteo, geocoding_url):
    mock_open_meteo.get(geocoding_url, json=GEOCODING_SEVILLE)

    for _ in range(60):
        assert auth_client.get(LOCATIONS, {"q": "Sevil"}).status_code == 200

    assert auth_client.get(LOCATIONS, {"q": "Sevil"}).status_code == 429
    assert len(mock_open_meteo.calls) == 1  # the other 59 were cache hits
