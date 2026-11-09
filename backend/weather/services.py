"""Weather use cases: call Open-Meteo, normalise the payload and cache the result.

Open-Meteo returns parallel arrays (`daily.time[i]`, `daily.temperature_2m_max[i]`...).
We turn them into lists of objects so clients can render rows directly.
"""

import logging

from django.conf import settings
from django.core.cache import cache

from . import client
from .codes import describe

logger = logging.getLogger(__name__)

LOCATION_RESULTS = 8
COORD_PRECISION = 2  # ~1.1 km: nearby searches share one cache entry

UNITS = {"temperature": "°C", "wind_speed": "km/h", "precipitation": "mm", "probability": "%"}


def _with_description(row: dict, code: int | None) -> dict:
    description, icon = describe(code)
    return {**row, "weather_code": code, "description": description, "icon": icon}


# --- locations -------------------------------------------------------------------------


def _normalise_location(raw: dict) -> dict:
    return {
        "id": raw["id"],
        "name": raw["name"],
        "admin1": raw.get("admin1", ""),
        "country": raw.get("country", ""),
        "country_code": raw.get("country_code", ""),
        "latitude": raw["latitude"],
        "longitude": raw["longitude"],
        "timezone": raw.get("timezone", ""),
    }


def search_locations(query: str) -> list[dict]:
    key = f"weather:locations:{query.strip().lower()}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    payload = client.fetch_locations(query, LOCATION_RESULTS)
    try:
        # Open-Meteo omits "results" entirely when nothing matches.
        locations = [_normalise_location(r) for r in payload.get("results", [])]
    except (KeyError, TypeError, AttributeError) as exc:
        logger.warning("Unexpected geocoding payload: %s", exc)
        raise client.WeatherServiceUnavailable from exc

    cache.set(key, locations, settings.WEATHER["LOCATIONS_CACHE_SECONDS"])
    return locations


# --- forecast --------------------------------------------------------------------------


def _normalise_forecast(raw: dict) -> dict:
    current = raw["current"]
    daily = raw["daily"]
    hourly = raw["hourly"]
    return {
        "location": {
            "latitude": raw["latitude"],
            "longitude": raw["longitude"],
            "timezone": raw["timezone"],
            "elevation": raw.get("elevation"),
        },
        "units": UNITS,
        "current": _with_description(
            {
                "time": current["time"],
                "temperature": current["temperature_2m"],
                "wind_speed": current["wind_speed_10m"],
                "is_day": bool(current["is_day"]),
            },
            current["weather_code"],
        ),
        "daily": [
            _with_description(
                {
                    "date": date,
                    "temperature_max": daily["temperature_2m_max"][i],
                    "temperature_min": daily["temperature_2m_min"][i],
                    "precipitation_probability": daily["precipitation_probability_max"][i],
                    "precipitation_sum": daily["precipitation_sum"][i],
                    "wind_speed_max": daily["wind_speed_10m_max"][i],
                },
                daily["weather_code"][i],
            )
            for i, date in enumerate(daily["time"])
        ],
        "hourly": [
            _with_description(
                {
                    "time": time,
                    "temperature": hourly["temperature_2m"][i],
                    "precipitation_probability": hourly["precipitation_probability"][i],
                    "wind_speed": hourly["wind_speed_10m"][i],
                },
                hourly["weather_code"][i],
            )
            for i, time in enumerate(hourly["time"])
        ],
    }


def _full_forecast(latitude: float, longitude: float) -> dict:
    """The 7-day forecast for a location, from cache when possible."""
    lat, lon = round(latitude, COORD_PRECISION), round(longitude, COORD_PRECISION)
    key = f"weather:forecast:{lat}:{lon}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    payload = client.fetch_forecast(lat, lon)
    try:
        forecast = _normalise_forecast(payload)
    except (KeyError, IndexError, TypeError) as exc:
        logger.warning("Unexpected forecast payload: %s", exc)
        raise client.WeatherServiceUnavailable from exc

    cache.set(key, forecast, settings.WEATHER["FORECAST_CACHE_SECONDS"])
    return forecast


def get_forecast(latitude: float, longitude: float, days: int) -> dict:
    """Forecast for the first `days` days (1, 3 or 7). All three share one cached 7-day fetch."""
    forecast = _full_forecast(latitude, longitude)
    daily = forecast["daily"][:days]
    dates = {day["date"] for day in daily}
    hourly = [hour for hour in forecast["hourly"] if hour["time"][:10] in dates]
    return {**forecast, "days": days, "daily": daily, "hourly": hourly}
