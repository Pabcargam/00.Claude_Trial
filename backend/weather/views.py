from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import (
    ForecastQuerySerializer,
    ForecastSerializer,
    LocationQuerySerializer,
    LocationSerializer,
)

UNAVAILABLE = OpenApiResponse(description="Open-Meteo is unreachable or answered unexpectedly.")


class WeatherView(APIView):
    """Shared config: logged-in users only, throttled per user (`weather` scope)."""

    throttle_scope = "weather"


class LocationSearchView(WeatherView):
    @extend_schema(
        summary="Location autocomplete",
        parameters=[LocationQuerySerializer],
        responses={200: LocationSerializer(many=True), 503: UNAVAILABLE},
    )
    def get(self, request):
        query = LocationQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        return Response(services.search_locations(query.validated_data["q"]))


class ForecastView(WeatherView):
    @extend_schema(
        summary="Forecast for a location (today, 3 days or 7 days)",
        parameters=[ForecastQuerySerializer],
        responses={200: ForecastSerializer, 503: UNAVAILABLE},
    )
    def get(self, request):
        query = ForecastQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        data = query.validated_data
        return Response(services.get_forecast(data["lat"], data["lon"], data["days"]))
