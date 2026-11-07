from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Public representation of a user. Never exposes the password hash or permissions."""

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "date_joined"]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, trim_whitespace=False, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ["id", "email", "password", "first_name", "last_name"]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate(self, attrs):
        # Run Django's password validators with the would-be user, so the
        # "too similar to your email/name" check works before the user exists.
        candidate = User(**{k: v for k, v in attrs.items() if k != "password"})
        validate_password(attrs["password"], user=candidate)
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
