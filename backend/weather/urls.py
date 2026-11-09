from django.urls import path

from .views import ForecastView, LocationSearchView

app_name = "weather"

urlpatterns = [
    path("locations/", LocationSearchView.as_view(), name="locations"),
    path("forecast/", ForecastView.as_view(), name="forecast"),
]
