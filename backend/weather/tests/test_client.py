from urllib.parse import parse_qs, urlsplit

import pytest
import requests

from weather import client

from .payloads import GEOCODING_SEVILLE, forecast_payload


def sent_params(call):
    return parse_qs(urlsplit(call.request.url).query)


def test_fetch_forecast_sends_expected_parameters(mock_open_meteo, forecast_url):
    mock_open_meteo.get(forecast_url, json=forecast_payload())

    client.fetch_forecast(37.38, -5.97)

    call = mock_open_meteo.calls[0]
    params = sent_params(call)
    assert params["latitude"] == ["37.38"]
    assert params["longitude"] == ["-5.97"]
    assert params["forecast_days"] == ["7"]
    assert params["timezone"] == ["auto"]
    assert set(params) >= {"current", "daily", "hourly"}
    assert call.request.headers["User-Agent"] == client.USER_AGENT


def test_fetch_locations_sends_query(mock_open_meteo, geocoding_url):
    mock_open_meteo.get(geocoding_url, json=GEOCODING_SEVILLE)

    result = client.fetch_locations("Sevil", 8)

    assert result == GEOCODING_SEVILLE
    params = sent_params(mock_open_meteo.calls[0])
    assert params["name"] == ["Sevil"]
    assert params["count"] == ["8"]


@pytest.mark.parametrize(
    "failure",
    [
        {"body": requests.Timeout("too slow")},
        {"body": requests.ConnectionError("dns")},
        {"status": 500, "json": {"error": True}},
        {"status": 400, "json": {"error": True, "reason": "Latitude must be in range"}},
        {"status": 200, "body": "<html>not json</html>"},
    ],
    ids=["timeout", "connection-error", "server-error", "bad-request", "invalid-json"],
)
def test_any_upstream_failure_becomes_503(mock_open_meteo, forecast_url, failure):
    mock_open_meteo.get(forecast_url, **failure)

    with pytest.raises(client.WeatherServiceUnavailable) as exc_info:
        client.fetch_forecast(0, 0)

    assert exc_info.value.status_code == 503


def test_unmocked_requests_never_reach_the_internet(mock_open_meteo):
    """Guard for the whole suite: the fixture turns real HTTP into an error."""
    with pytest.raises(client.WeatherServiceUnavailable):
        client.fetch_locations("Paris", 1)
