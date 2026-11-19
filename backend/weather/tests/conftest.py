import pytest
import responses
from django.conf import settings


@pytest.fixture
def mock_open_meteo():
    """Intercept every HTTP call made with `requests`.

    Unregistered URLs raise ConnectionError, so a test can never reach the real
    Open-Meteo. Tests register the responses they need and assert on `.calls`.
    """
    with responses.RequestsMock(assert_all_requests_are_fired=False) as rsps:
        yield rsps


@pytest.fixture
def geocoding_url():
    return settings.WEATHER["GEOCODING_URL"]


@pytest.fixture
def forecast_url():
    return settings.WEATHER["FORECAST_URL"]
