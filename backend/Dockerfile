# syntax=docker/dockerfile:1

# ---- base: shared runtime ---------------------------------------------------
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home-dir /app app

# ---- dev: hot reload, test and lint tooling ---------------------------------
FROM base AS dev

COPY requirements/ requirements/
RUN pip install -r requirements/dev.txt

COPY --chown=app:app . .
USER app

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ---- prod: gunicorn, no dev dependencies ------------------------------------
FROM base AS prod

ENV DJANGO_SETTINGS_MODULE=config.settings.prod

COPY requirements/base.txt requirements/base.txt
RUN pip install -r requirements/base.txt

COPY --chown=app:app . .

# collectstatic only needs settings to import; real values come at runtime.
RUN DJANGO_SECRET_KEY=build-only DATABASE_URL=sqlite:////tmp/build.db REDIS_URL=redis://localhost:6379/0 \
    python manage.py collectstatic --noinput

USER app

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-"]
