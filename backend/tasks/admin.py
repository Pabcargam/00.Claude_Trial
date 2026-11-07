from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "priority", "is_completed", "due_date", "is_outdoor")
    list_filter = ("priority", "is_completed", "is_outdoor")
    search_fields = ("title", "description", "owner__email")
    list_select_related = ("owner",)
    readonly_fields = ("completed_at", "created_at", "updated_at")
