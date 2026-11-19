import django_filters
from django import forms

from .models import Priority, Task


class UpperMultipleChoiceField(forms.MultipleChoiceField):
    """Accept `?priority=high` like the serializer does (choices are upper-case names)."""

    def to_python(self, value):
        return [v.upper() for v in super().to_python(value)]


class CaseInsensitiveMultipleChoiceFilter(django_filters.MultipleChoiceFilter):
    field_class = UpperMultipleChoiceField


class TaskFilter(django_filters.FilterSet):
    priority = CaseInsensitiveMultipleChoiceFilter(
        choices=[(p.name, p.label) for p in Priority],
        method="filter_priority",
        help_text="Repeatable: ?priority=HIGH&priority=URGENT",
    )
    completed = django_filters.BooleanFilter(field_name="is_completed")
    is_outdoor = django_filters.BooleanFilter()
    due_before = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")
    due_after = django_filters.DateFilter(field_name="due_date", lookup_expr="gte")

    class Meta:
        model = Task
        fields = ["priority", "completed", "is_outdoor", "due_before", "due_after"]

    def filter_priority(self, queryset, name, value):
        return queryset.filter(priority__in=[Priority[v].value for v in value])
