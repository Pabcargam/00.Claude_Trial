from rest_framework import serializers

from .models import Priority, Task


class PriorityField(serializers.ChoiceField):
    """Exposes priority as its name ("LOW".."URGENT") while the DB stores 1..4."""

    def __init__(self, **kwargs):
        super().__init__(choices=Priority.names, **kwargs)

    def to_representation(self, value):
        return Priority(value).name

    def to_internal_value(self, data):
        name = super().to_internal_value(data.upper() if isinstance(data, str) else data)
        return Priority[name].value


class TaskSerializer(serializers.ModelSerializer):
    priority = PriorityField(required=False)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "priority",
            "is_completed",
            "completed_at",
            "due_date",
            "is_outdoor",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at", "updated_at"]
        # DRF's CharField already trims whitespace and rejects blank titles.
