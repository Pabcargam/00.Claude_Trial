"""WMO weather interpretation codes used by Open-Meteo.

https://open-meteo.com/en/docs (section "WMO Weather interpretation codes").
Each code maps to a human description and a small icon key the frontend can
turn into an image, so clients never need to know the numeric codes.
"""

UNKNOWN = ("Unknown", "unknown")

WEATHER_CODES: dict[int, tuple[str, str]] = {
    0: ("Clear sky", "clear"),
    1: ("Mainly clear", "clear"),
    2: ("Partly cloudy", "partly-cloudy"),
    3: ("Overcast", "cloudy"),
    45: ("Fog", "fog"),
    48: ("Depositing rime fog", "fog"),
    51: ("Light drizzle", "drizzle"),
    53: ("Moderate drizzle", "drizzle"),
    55: ("Dense drizzle", "drizzle"),
    56: ("Light freezing drizzle", "freezing-rain"),
    57: ("Dense freezing drizzle", "freezing-rain"),
    61: ("Slight rain", "rain"),
    63: ("Moderate rain", "rain"),
    65: ("Heavy rain", "rain"),
    66: ("Light freezing rain", "freezing-rain"),
    67: ("Heavy freezing rain", "freezing-rain"),
    71: ("Slight snow fall", "snow"),
    73: ("Moderate snow fall", "snow"),
    75: ("Heavy snow fall", "snow"),
    77: ("Snow grains", "snow"),
    80: ("Slight rain showers", "showers"),
    81: ("Moderate rain showers", "showers"),
    82: ("Violent rain showers", "showers"),
    85: ("Slight snow showers", "snow"),
    86: ("Heavy snow showers", "snow"),
    95: ("Thunderstorm", "thunderstorm"),
    96: ("Thunderstorm with slight hail", "thunderstorm"),
    99: ("Thunderstorm with heavy hail", "thunderstorm"),
}


def describe(code: int | None) -> tuple[str, str]:
    """Return (description, icon) for a WMO code; unknown or missing codes are tolerated."""
    return WEATHER_CODES.get(code, UNKNOWN)
