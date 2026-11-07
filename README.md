# TODO + Weather Planner

A web app for planning everyday tasks around the weather. You keep a **TODO list** with
priorities, and next to it you see the **weather forecast** for any place you search. If a chore means
going outside, you can pick the best day for it.

> **Status:** 🏗️ Phase 2 done: the backend API for accounts (JWT) and tasks works and is tested.
> Next up: the weather API (Phase 3), then the frontend.

---

## Goals

1. **Task management**: create, edit, complete (cross out) and delete tasks, each with a priority.
2. **Weather at a glance**: search a location and see its forecast update as you type.
3. **Plan ahead**: switch the forecast between **Today**, **3 days** and **1 week**, so outdoor tasks
   can be scheduled on good-weather days.
4. **Robust and safe by default**: user accounts, per-user data isolation, tests for every change,
   containerised environments and CI from day one.

## Features

### TODO list
- Add tasks with a title, an optional description and a **priority** (`Low`, `Medium`, `High`, `Urgent`)
- Edit the text and the priority inline
- Mark a task as done (crossed out) or undo it
- Delete tasks
- Filter and sort by priority and status, and search by text
- Optional due date and an "outdoor" flag to link tasks to the forecast

### Weather
- Location search box with autocomplete (debounced, so it updates as you type)
- Forecast filters: **Current day**, **3 days**, **1 week**
- Daily summary (min/max temperature, chance of rain, wind, weather icon) plus hourly detail for today
- Weather data is fetched by the backend and cached, so the frontend never calls third-party APIs

### Accounts
- Register and log in (JWT access and refresh tokens)
- Each user only sees and changes their own tasks

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, JavaScript, TanStack Query, Axios, CSS Modules (React Router comes with auth) |
| Backend | Python 3.12, Django 6.1, Django REST Framework, SimpleJWT, django-filter, drf-spectacular (OpenAPI / Swagger) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 (weather responses, rate limiting) |
| Weather data | [Open-Meteo](https://open-meteo.com/) geocoding and forecast APIs (free, no API key) |
| Testing | pytest, pytest-django, factory_boy, responses · Vitest, React Testing Library, MSW |
| Quality | Ruff (Python), oxlint and Prettier (JS), pre-commit |
| Infrastructure | Docker, Docker Compose, Nginx (production), GitHub Actions (CI) |
| API tooling | Swagger UI, Postman collection |

## Architecture

```
┌──────────────┐   HTTP/JSON   ┌──────────────┐     ┌──────────────────────────┐
│  React SPA   │ ────────────► │    Nginx     │ ──► │  Django + DRF (gunicorn) │
│ (Vite, JS)   │               │ (prod only)  │     └────────────┬─────────────┘
└──────────────┘               └──────────────┘                  │
                                          ┌──────────────────────┼──────────────────────┐
                                          ▼                      ▼                      ▼
                                  ┌──────────────┐       ┌──────────────┐      ┌─────────────────┐
                                  │ PostgreSQL   │       │    Redis     │      │  Open-Meteo API │
                                  │ users, tasks │       │ weather cache│      │ geocode/forecast│
                                  └──────────────┘       └──────────────┘      └─────────────────┘
```

### API (v1)

✅ = available now; the rest is planned.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/health/` | ✅ Database and cache status (`503` when degraded) |
| `POST` | `/api/v1/auth/register/` | ✅ Create an account (`email`, `password`, optional `first_name`, `last_name`) |
| `POST` | `/api/v1/auth/token/` | ✅ Log in with `email` + `password` → `access` (15 min) and `refresh` (7 days) tokens |
| `POST` | `/api/v1/auth/token/refresh/` | ✅ New access token; the refresh token is rotated and the old one revoked |
| `POST` | `/api/v1/auth/logout/` | ✅ Revoke a refresh token (`{"refresh": "..."}`) |
| `GET` | `/api/v1/auth/me/` | ✅ The logged-in user's profile |
| `GET` / `POST` | `/api/v1/tasks/` | ✅ List (filter, search, order, paginate) and create tasks |
| `GET` / `PATCH` / `DELETE` | `/api/v1/tasks/{id}/` | ✅ Read, update and delete one of your tasks |
| `GET` | `/api/v1/weather/locations/?q=` | Location autocomplete |
| `GET` | `/api/v1/weather/forecast/?lat=&lon=&days=1\|3\|7` | Forecast for a location |

Interactive docs: <http://localhost:8000/api/docs/> (Swagger UI). Raw schema: `/api/schema/`.

**Authentication.** Every endpoint except health, register, login, refresh and logout needs an
`Authorization: Bearer <access>` header. Register and login are limited to 10 requests per minute per client
(`429` beyond that). Emails are case-insensitive.

**Task fields**

| Field | Notes |
|---|---|
| `title` | Required, up to 200 characters (surrounding spaces are trimmed) |
| `description` | Optional |
| `priority` | `LOW`, `MEDIUM` (default), `HIGH`, `URGENT`; case-insensitive on input |
| `is_completed` | `true` fills `completed_at`; `false` clears it |
| `due_date` | Optional, `YYYY-MM-DD` |
| `is_outdoor` | Marks weather-dependent tasks |
| `id`, `completed_at`, `created_at`, `updated_at` | Read-only |

**Listing tasks.** Query parameters:
- Filters: `priority` (repeatable: `?priority=HIGH&priority=URGENT`), `completed`, `is_outdoor`, `due_before`, `due_after`
- Text search: `search` (title and description)
- Sorting: `ordering` with `priority`, `due_date`, `created_at`, `updated_at` or `title`; prefix `-` for descending
- Pagination: `page`, `page_size` (default 50, max 200)

The default order is open tasks first, then most urgent, then soonest due date. You only ever see your own
tasks: another user's task answers `404`, as if it didn't exist.

**Try it with curl** (stack running):

```bash
curl -X POST localhost:8000/api/v1/auth/register/ -H 'Content-Type: application/json' \
  -d '{"email": "me@example.com", "password": "Sup3r-secret!"}'

ACCESS=$(curl -s -X POST localhost:8000/api/v1/auth/token/ -H 'Content-Type: application/json' \
  -d '{"email": "me@example.com", "password": "Sup3r-secret!"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access"])')

curl -X POST localhost:8000/api/v1/tasks/ -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' \
  -d '{"title": "Paint the fence", "priority": "HIGH", "is_outdoor": true}'

curl "localhost:8000/api/v1/tasks/?priority=HIGH" -H "Authorization: Bearer $ACCESS"
```

## Repository layout

```
.
├── backend/
│   ├── config/             # Django project: urls, settings/{base,dev,test,prod}.py
│   ├── core/               # Cross-cutting endpoints (health check)
│   ├── accounts/           # Email-based User model and JWT auth endpoints
│   ├── tasks/              # Task model and per-user CRUD API
│   ├── conftest.py         # Shared pytest fixtures
│   ├── requirements/       # base.txt (runtime) and dev.txt (tests, lint)
│   └── pyproject.toml      # Ruff, pytest and coverage config
├── frontend/
│   └── src/                # api/ (Axios client), components/, test/ (MSW setup)
├── .github/workflows/      # CI pipeline
├── docker-compose.yml      # Local development stack
├── .pre-commit-config.yaml # Lint/format hooks
└── .env.example            # Optional overrides (real .env is never committed)
```

Coming later: backend app `weather/`, `docs/` (Postman collection), `docker-compose.prod.yml`.

## Branching strategy

Feature-based workflow with three long-lived branches:

```
feature/* ─┐
fix/*     ─┼─► develop ──► qa ──► main  (tag vX.Y.Z → deploy)
refactor/*─┘       ▲                │
                   └── hotfix/* ◄───┘
```

| Branch | Purpose | Created from | Merged into |
|---|---|---|---|
| `main` | Production-ready, released code. Each merge is tagged `vX.Y.Z` and deployed | — | — |
| `qa` | Testing and staging. Release candidates are checked here | — | `main` |
| `develop` | Integration of finished work. Next release in progress | — | `qa` |
| `feature/<name>` | New functionality (e.g. `feature/tasks-crud`) | `develop` | `develop` |
| `fix/<name>` | Non-urgent bug fixes | `develop` | `develop` |
| `refactor/`, `test/`, `docs/`, `chore/`, `ci/` | Changes that are not features | `develop` | `develop` |
| `hotfix/<name>` | Urgent production fixes | `main` | `main` and `develop` |

Conventions:
- Short-lived branch names are kebab-case and have one purpose each. They are deleted after merging.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat(tasks): add priority filter`.
- `main`, `qa` and `develop` are protected by a GitHub ruleset: changes need a pull request, and force-pushes and
  deletion are blocked.
- Short-lived branches are **squash-merged** into `develop`. Promotions (`develop → qa → main`) use **merge commits**,
  so the three long-lived branches keep the same history.

## Roadmap

- [x] Project definition and architecture
- [x] Git branching strategy (`main`, `qa`, `develop` + short-lived branches)
- [x] **Phase 1:** Scaffolding: repo skeleton, Docker Compose, CI, linting, health endpoint
- [x] **Phase 2:** Backend: auth and tasks CRUD, with tests
- [ ] **Phase 3:** Backend: weather proxy with Redis cache, with tests
- [ ] **Phase 4:** Frontend: auth and TODO list UI, with tests
- [ ] **Phase 5:** Frontend: weather panel and forecast filters, with tests
- [ ] **Phase 6:** Production compose with Nginx, Postman collection, polish and refactor

## Getting started

### Requirements
- Docker with Docker Compose v2
- For running tools outside Docker (optional): Python 3.12+, Node 22.12+ with **npm 11+**

### Run the whole stack

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (Vite, hot reload) | <http://localhost:5173> |
| Backend API | <http://localhost:8000/api/v1/> |
| Swagger UI | <http://localhost:8000/api/docs/> |
| Django admin | <http://localhost:8000/admin/> |
| PostgreSQL | `localhost:5433` (user `todo`, db `todo_weather`) |
| Redis | `localhost:6379` |

Every setting has a development default. To change something (for example a host port that's already
in use), copy `.env.example` to `.env` and edit it. Create an admin user with:

```bash
docker compose exec backend python manage.py createsuperuser
```

### Backend

```bash
cd backend
python3.12 -m venv .venv && .venv/bin/pip install -r requirements/dev.txt
.venv/bin/pytest                                  # tests + coverage (SQLite in memory, no Docker needed)
.venv/bin/pytest core/tests/test_health.py -k database  # a single file / test
.venv/bin/ruff check . && .venv/bin/ruff format .  # lint + format
```

To run the tests against PostgreSQL in the running stack:

```bash
docker compose exec -e DATABASE_URL=postgres://todo:todo-dev-password@db:5432/todo_weather backend pytest
```

### Frontend

```bash
cd frontend
npm ci
npm test                 # Vitest, once
npm run test:watch       # watch mode
npm run coverage         # with coverage thresholds (90%)
npx vitest run src/components/HealthBadge.test.jsx   # a single file
npm run lint && npm run format:check
npm run build
```

### Git hooks

```bash
backend/.venv/bin/pre-commit install       # run hooks on every commit
backend/.venv/bin/pre-commit run --all-files
```

### Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `main`, `qa` and
`develop`. It covers backend lint, Django checks (including `check --deploy` on production settings) and
tests on PostgreSQL and Redis; frontend lint, tests with coverage and the build; and Docker image builds.

## License

To be decided.
