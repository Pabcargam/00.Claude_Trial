"""Fake Open-Meteo payloads, shaped like real responses (sampled 2026-11-09)."""

import datetime as dt

GEOCODING_SEVILLE = {
    "results": [
        {
            "id": 2510911,
            "name": "Seville",
            "latitude": 37.38283,
            "longitude": -5.97317,
            "elevation": 16.0,
            "feature_code": "PPLA",
            "country_code": "ES",
            "timezone": "Europe/Madrid",
            "population": 686741,
            "postcodes": ["41001", "41002"],
            "country": "Spain",
            "admin1": "Andalusia",
            "admin2": "Seville",
        },
        {
            # No admin1/country keys: Open-Meteo omits them for some places.
            "id": 3668132,
            "name": "Sevilla",
            "latitude": 4.26548,
            "longitude": -75.93151,
            "country_code": "CO",
            "timezone": "America/Bogota",
        },
    ],
    "generationtime_ms": 0.5,
}

GEOCODING_NO_RESULTS = {"generationtime_ms": 0.13}

START = dt.date(2026, 11, 9)
DAILY_CODES = [0, 2, 61, 95, 3, 80, 999]  # 999: a code our mapping doesn't know


def forecast_payload(days: int = 7) -> dict:
    dates = [(START + dt.timedelta(days=i)).isoformat() for i in range(days)]
    hours = [f"{d}T{h:02d}:00" for d in dates for h in range(24)]
    return {
        "latitude": 37.364082,
        "longitude": -5.956622,
        "generationtime_ms": 0.47,
        "utc_offset_seconds": 3600,
        "timezone": "Europe/Madrid",
        "timezone_abbreviation": "GMT+1",
        "elevation": 15.0,
        "current": {
            "time": f"{dates[0]}T11:00",
            "interval": 900,
            "temperature_2m": 20.7,
            "weather_code": 80,
            "wind_speed_10m": 17.2,
            "is_day": 1,
        },
        "daily": {
            "time": dates,
            "weather_code": DAILY_CODES[:days],
            "temperature_2m_max": [21.8 + i for i in range(days)],
            "temperature_2m_min": [12.0 + i for i in range(days)],
            "precipitation_probability_max": [10 * i for i in range(days)],
            "precipitation_sum": [0.5 * i for i in range(days)],
            "wind_speed_10m_max": [19.6] * days,
        },
        "hourly": {
            "time": hours,
            "temperature_2m": [15.0] * len(hours),
            "precipitation_probability": [None if i == 0 else 20 for i in range(len(hours))],
            "weather_code": [1] * len(hours),
            "wind_speed_10m": [9.2] * len(hours),
        },
    }
