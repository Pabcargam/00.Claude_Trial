"""Thin HTTP client for Open-Meteo. The only module that talks to the outside world."""

import logging

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

USER_AGENT = "todo-weather-planner/0.1"

CURRENT_FIELDS = "temperature_2m,weather_code,wind_speed_10m,is_day"
DAILY_FIELDS = (
    "weather_code,temperature_2m_max,temperature_2m_min,"
    "precipitation_probability_max,precipitation_sum,wind_speed_10m_max"
)
HOURLY_FIELDS = "temperature_2m,precipitation_probability,weather_code,wind_speed_10m"
FORECAST_DAYS = 7


class WeatherServiceUnavailable(APIException):
    """Any upstream problem. Clients get one clear 503 instead of Open-Meteo's details."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "The weather service is temporarily unavailable. Please try again shortly."
    default_code = "weather_unavailable"


def _get(url: str, params: dict) -> dict:
    try:
        response = requests.get(
            url,
            params=params,
            timeout=settings.WEATHER["TIMEOUT_SECONDS"],
            headers={"User-Agent": USER_AGENT},
        )
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        # ValueError covers a body that isn't valid JSON.
        logger.warning("Open-Meteo request failed: %s %s", url, exc)
        raise WeatherServiceUnavailable from exc


def fetch_locations(query: str, count: int) -> dict:
    return _get(
        settings.WEATHER["GEOCODING_URL"],
        {"name": query, "count": count, "language": "en", "format": "json"},
    )


def fetch_forecast(latitude: float, longitude: float) -> dict:
    return _get(
        settings.WEATHER["FORECAST_URL"],
        {
            "latitude": latitude,
            "longitude": longitude,
            "current": CURRENT_FIELDS,
            "daily": DAILY_FIELDS,
            "hourly": HOURLY_FIELDS,
            "timezone": "auto",
            "forecast_days": FORECAST_DAYS,
        },
    )
