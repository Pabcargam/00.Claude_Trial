import pytest

from weather import services
from weather.client import WeatherServiceUnavailable
from weather.codes import describe

from .payloads import GEOCODING_NO_RESULTS, GEOCODING_SEVILLE, START, forecast_payload

# --- codes ---------------------------------------------------------------------------------


def test_known_and_unknown_weather_codes():
    assert describe(95) == ("Thunderstorm", "thunderstorm")
    assert describe(999) == ("Unknown", "unknown")
    assert describe(None) == ("Unknown", "unknown")


# --- locations ---------------------------------------------------------------------------


def test_search_locations_normalises_results(mock_open_meteo, geocoding_url):
    mock_open_meteo.get(geocoding_url, json=GEOCODING_SEVILLE)

    locations = services.search_locations("Sevil")

    assert locations[0] == {
        "id": 2510911,
        "name": "Seville",
        "admin1": "Andalusia",
        "country": "Spain",
        "country_code": "ES",
        "latitude": 37.38283,
        "longitude": -5.97317,
        "timezone": "Europe/Madrid",
    }
    # Missing optional keys become empty strings instead of crashing.
    assert locations[1]["admin1"] == ""
    assert locations[1]["country"] == ""


def test_search_without_results_returns_empty_list(mock_open_meteo, geocoding_url):
    mock_open_meteo.get(geocoding_url, json=GEOCODING_NO_RESULTS)

    assert services.search_locations("zzzxqq") == []


def test_search_is_cached_case_insensitively(mock_open_meteo, geocoding_url):
    mock_open_meteo.get(geocoding_url, json=GEOCODING_SEVILLE)

    first = services.search_locations("Sevil")
    second = services.search_locations("  sEVIL ")

    assert first == second
    assert len(mock_open_meteo.calls) == 1


def test_malformed_geocoding_payload_is_503_and_not_cached(mock_open_meteo, geocoding_url):
    mock_open_meteo.get(geocoding_url, json={"results": [{"name": "no id or coordinates"}]})
    mock_open_meteo.get(geocoding_url, json=GEOCODING_SEVILLE)

    with pytest.raises(WeatherServiceUnavailable):
        services.search_locations("Sevil")
    assert services.search_locations("Sevil")[0]["name"] == "Seville"
    assert len(mock_open_meteo.calls) == 2


# --- forecast ----------------------------------------------------------------------------


def test_forecast_is_normalised_into_rows(mock_open_meteo, forecast_url):
    mock_open_meteo.get(forecast_url, json=forecast_payload())

    forecast = services.get_forecast(37.38, -5.97, days=7)

    assert forecast["days"] == 7
    assert forecast["location"] == {
        "latitude": 37.364082,
        "longitude": -5.956622,
        "timezone": "Europe/Madrid",
        "elevation": 15.0,
    }
    assert forecast["units"]["temperature"] == "°C"
    assert forecast["current"] == {
        "time": "2026-11-09T11:00",
        "temperature": 20.7,
        "wind_speed": 17.2,
        "is_day": True,
        "weather_code": 80,
        "description": "Slight rain showers",
        "icon": "showers",
    }
    assert forecast["daily"][3] == {
        "date": "2026-11-12",
        "temperature_max": 24.8,
        "temperature_min": 15.0,
        "precipitation_probability": 30,
        "precipitation_sum": 1.5,
        "wind_speed_max": 19.6,
        "weather_code": 95,
        "description": "Thunderstorm",
        "icon": "thunderstorm",
    }
    assert forecast["daily"][6]["icon"] == "unknown"
    assert len(forecast["hourly"]) == 168
    assert forecast["hourly"][0]["precipitation_probability"] is None


@pytest.mark.parametrize("days", [1, 3, 7])
def test_forecast_slices_days_and_matching_hours(mock_open_meteo, forecast_url, days):
    mock_open_meteo.get(forecast_url, json=forecast_payload())

    forecast = services.get_forecast(37.38, -5.97, days=days)

    assert [d["date"] for d in forecast["daily"]] == [
        f"2026-11-{START.day + i:02d}" for i in range(days)
    ]
    assert len(forecast["hourly"]) == 24 * days
    assert forecast["hourly"][-1]["time"] == f"2026-11-{START.day + days - 1:02d}T23:00"


def test_one_upstream_call_serves_all_day_filters(mock_open_meteo, forecast_url):
    mock_open_meteo.get(forecast_url, json=forecast_payload())

    for days in (1, 3, 7):
        services.get_forecast(37.38, -5.97, days=days)

    assert len(mock_open_meteo.calls) == 1


def test_nearby_coordinates_share_the_cache_and_upstream_gets_rounded_values(
    mock_open_meteo, forecast_url
):
    mock_open_meteo.get(forecast_url, json=forecast_payload())

    services.get_forecast(37.38283, -5.97317, days=7)
    services.get_forecast(37.3801, -5.9699, days=7)

    assert len(mock_open_meteo.calls) == 1
    url = mock_open_meteo.calls[0].request.url
    assert "latitude=37.38" in url
    assert "longitude=-5.97" in url


def test_different_locations_are_cached_separately(mock_open_meteo, forecast_url):
    mock_open_meteo.get(forecast_url, json=forecast_payload())

    services.get_forecast(37.38, -5.97, days=7)
    services.get_forecast(40.42, -3.70, days=7)

    assert len(mock_open_meteo.calls) == 2


def test_failures_are_not_cached(mock_open_meteo, forecast_url):
    mock_open_meteo.get(forecast_url, status=502)
    mock_open_meteo.get(forecast_url, json=forecast_payload())

    with pytest.raises(WeatherServiceUnavailable):
        services.get_forecast(37.38, -5.97, days=7)
    assert services.get_forecast(37.38, -5.97, days=7)["days"] == 7


@pytest.mark.parametrize(
    "broken",
    [
        {"latitude": 1},  # most keys missing
        {**forecast_payload(), "daily": {**forecast_payload()["daily"], "precipitation_sum": []}},
    ],
    ids=["missing-keys", "short-array"],
)
def test_malformed_forecast_payload_is_503(mock_open_meteo, forecast_url, broken):
    mock_open_meteo.get(forecast_url, json=broken)

    with pytest.raises(WeatherServiceUnavailable):
        services.get_forecast(37.38, -5.97, days=7)
