from rest_framework import serializers

DAYS_CHOICES = [1, 3, 7]


# --- query parameters ------------------------------------------------------------------


class LocationQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=2, max_length=100, help_text="Place name, e.g. 'Sevil'.")


class ForecastQuerySerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lon = serializers.FloatField(min_value=-180, max_value=180)
    days = serializers.ChoiceField(choices=DAYS_CHOICES, default=7)

    def validate_days(self, value):
        return int(value)


# --- responses (documentation only: the service already returns plain dicts) -----------


class LocationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    admin1 = serializers.CharField(help_text="Region or state, may be empty.")
    country = serializers.CharField()
    country_code = serializers.CharField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    timezone = serializers.CharField()


class _ConditionsMixin(serializers.Serializer):
    weather_code = serializers.IntegerField(allow_null=True, help_text="WMO weather code.")
    description = serializers.CharField()
    icon = serializers.CharField(help_text="Icon key, e.g. 'rain', 'clear', 'thunderstorm'.")


class CurrentSerializer(_ConditionsMixin):
    time = serializers.CharField()
    temperature = serializers.FloatField()
    wind_speed = serializers.FloatField()
    is_day = serializers.BooleanField()


class DailySerializer(_ConditionsMixin):
    date = serializers.DateField()
    temperature_max = serializers.FloatField()
    temperature_min = serializers.FloatField()
    precipitation_probability = serializers.IntegerField(allow_null=True)
    precipitation_sum = serializers.FloatField()
    wind_speed_max = serializers.FloatField()


class HourlySerializer(_ConditionsMixin):
    time = serializers.CharField(help_text="Local time of the location, ISO 8601.")
    temperature = serializers.FloatField()
    precipitation_probability = serializers.IntegerField(allow_null=True)
    wind_speed = serializers.FloatField()


class ForecastLocationSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    timezone = serializers.CharField()
    elevation = serializers.FloatField(allow_null=True)


class UnitsSerializer(serializers.Serializer):
    temperature = serializers.CharField()
    wind_speed = serializers.CharField()
    precipitation = serializers.CharField()
    probability = serializers.CharField()


class ForecastSerializer(serializers.Serializer):
    days = serializers.ChoiceField(choices=DAYS_CHOICES)
    location = ForecastLocationSerializer()
    units = UnitsSerializer()
    current = CurrentSerializer()
    daily = DailySerializer(many=True)
    hourly = HourlySerializer(many=True)
