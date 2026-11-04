# TODO + Weather Planner

A web app for planning everyday tasks around the weather. You keep a **TODO list** with
priorities, and next to it you see the **weather forecast** for any place you search. If a chore means
going outside, you can pick the best day for it.

> **Status:** 🧭 Planning. The architecture has been agreed; scaffolding comes next.

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
| Frontend | React 18, Vite, JavaScript, React Router, TanStack Query, Axios, CSS Modules |
| Backend | Python 3.12, Django 5, Django REST Framework, SimpleJWT, drf-spectacular (OpenAPI / Swagger) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 (weather responses, rate limiting) |
| Weather data | [Open-Meteo](https://open-meteo.com/) geocoding and forecast APIs (free, no API key) |
| Testing | pytest, pytest-django, factory_boy, responses · Vitest, React Testing Library, MSW |
| Quality | Ruff (Python), ESLint and Prettier (JS), pre-commit |
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

### Planned API (v1)

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register/` | Create an account |
| `POST` | `/api/v1/auth/token/` | Log in (get access and refresh tokens) |
| `POST` | `/api/v1/auth/token/refresh/` | Refresh the access token |
| `POST` | `/api/v1/auth/logout/` | Blacklist the refresh token |
| `GET` / `POST` | `/api/v1/tasks/` | List (filter, search, order) and create tasks |
| `GET` / `PATCH` / `DELETE` | `/api/v1/tasks/{id}/` | Read, update and delete a task |
| `GET` | `/api/v1/weather/locations/?q=` | Location autocomplete |
| `GET` | `/api/v1/weather/forecast/?lat=&lon=&days=1\|3\|7` | Forecast for a location |

Interactive docs will be served at `/api/docs/`.

## Planned repository layout

```
.
├── backend/            # Django project (config/) and apps: accounts/, tasks/, weather/
├── frontend/           # Vite + React app
├── docs/               # Architecture notes, Postman collection
├── .github/workflows/  # CI pipelines
├── docker-compose.yml        # Local development
├── docker-compose.prod.yml   # Production-like stack
└── .env.example        # Environment variables template (real .env is never committed)
```

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
- Changes reach `develop`, `qa` and `main` only through pull requests, never by direct commits or force-pushes.

## Roadmap

- [x] Project definition and architecture
- [x] Git branching strategy (`main`, `qa`, `develop` + short-lived branches)
- [ ] **Phase 1:** Scaffolding: repo skeleton, Docker Compose, CI, linting, health endpoint
- [ ] **Phase 2:** Backend: auth and tasks CRUD, with tests
- [ ] **Phase 3:** Backend: weather proxy with Redis cache, with tests
- [ ] **Phase 4:** Frontend: auth and TODO list UI, with tests
- [ ] **Phase 5:** Frontend: weather panel and forecast filters, with tests
- [ ] **Phase 6:** Production compose with Nginx, Postman collection, polish and refactor

## Getting started

Setup instructions will be added in Phase 1. The goal is a single command to run everything locally:

```bash
docker compose up --build
```

## License

To be decided.
