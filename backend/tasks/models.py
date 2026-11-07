from django.conf import settings
from django.db import models
from django.db.models import F
from django.utils import timezone


class Priority(models.IntegerChoices):
    """Stored as integers so ordering by priority is meaningful (URGENT > HIGH > ...)."""

    LOW = 1, "Low"
    MEDIUM = 2, "Medium"
    HIGH = 3, "High"
    URGENT = 4, "Urgent"


class Task(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.PositiveSmallIntegerField(choices=Priority, default=Priority.MEDIUM)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True, editable=False)
    due_date = models.DateField(null=True, blank=True)
    is_outdoor = models.BooleanField(
        default=False, help_text="Weather-dependent task (shown next to the forecast)."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Open first, then most urgent, then soonest due (no due date last), newest first.
        ordering = [
            "is_completed",
            "-priority",
            F("due_date").asc(nulls_last=True),
            "-created_at",
        ]
        indexes = [
            models.Index(
                fields=["owner", "is_completed", "priority"], name="task_owner_status_prio_idx"
            ),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # completed_at always mirrors is_completed, whoever changes it (API, admin, shell).
        if self.is_completed and self.completed_at is None:
            self.completed_at = timezone.now()
        elif not self.is_completed:
            self.completed_at = None
        update_fields = kwargs.get("update_fields")
        if update_fields is not None and "is_completed" in update_fields:
            kwargs["update_fields"] = {*update_fields, "completed_at"}
        super().save(*args, **kwargs)
