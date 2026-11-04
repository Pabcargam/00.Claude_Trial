# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TODO + Weather Planner**: a multi-user web app with a prioritised TODO list next to a weather forecast
(location search with autocomplete; filters for Today / 3 days / 1 week), so users can plan outdoor chores.
See `README.md` for features, the planned API and the roadmap.

**Current state:** planning is done and the repo holds only docs. Phase 1 (scaffolding) has not started.
Update the *Commands* section below once the tooling exists. Do not document commands that don't work yet.

## Role and working agreement

The user (Pablo, GitHub `Pabcargam`) is the lead engineer and architect. Claude acts as a **senior full-stack developer**:
HTML/CSS/JavaScript/React on the frontend; Python/Django/DRF, Go, REST APIs, PostgreSQL/SQL, NoSQL (Redis),
Docker, Postman and GitHub on the backend. New technologies are added only when the plan needs them, and after discussing them with Pablo.

- Be meticulous: re-read and re-check finished work before reporting it done.
- Every change ships with tests, and the tests are **run**, not just written. Report failures honestly.
- Refactor when it makes the code clearer, but keep refactors separate from feature changes.
- Architecture or stack changes go to Pablo for a decision first. Don't silently diverge from the agreed design.
- Pablo is experienced in backend and DevOps (Django, Docker, Kubernetes, CI/CD), so skip the basics there. He is
  learning Claude Code, so briefly explaining Claude Code features or workflows when they come up is useful.
- Commits use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). Default branch: `main`.
  Commit or push only when asked.

## Agreed architecture

```
React SPA (Vite, JavaScript) ──► Nginx (prod) ──► Django + DRF (gunicorn)
                                                   ├── PostgreSQL 16  (users, tasks)
                                                   ├── Redis 7        (weather cache, throttling)
                                                   └── Open-Meteo     (geocoding + forecast, no API key)
```

- **Frontend** (`frontend/`): React 18 + Vite, **plain JavaScript (not TypeScript)**, React Router, TanStack Query, Axios,
  CSS Modules. Tests: Vitest + React Testing Library + MSW.
- **Backend** (`backend/`): Django 5 + DRF; project package `config/`; apps `accounts/`, `tasks/`, `weather/`.
  SimpleJWT (access 15 min, refresh 7 days, rotation and blacklist), drf-spectacular (Swagger at `/api/docs/`),
  django-environ, django-cors-headers. Tests: pytest + pytest-django + factory_boy + `responses`. Coverage target ≥ 90%.
- **Infra**: `docker-compose.yml` (dev, hot reload) and `docker-compose.prod.yml` (gunicorn + Nginx serving the built SPA);
  GitHub Actions CI runs lint and tests for both sides. Config comes from `.env` (template in `.env.example`).
- **Quality**: Ruff (Python), ESLint + Prettier (JS), pre-commit.

### Key design rules
- **The frontend never calls Open-Meteo directly.** The `weather` app proxies it, normalises the response and caches it
  in Redis (about 10–15 min per rounded lat/lon). Tests mock Open-Meteo with `responses`. Never hit the real API in tests.
- **"Real-time" weather** means a debounced (~300 ms) location autocomplete. Picking a location fetches a 7-day
  forecast **once**. The Today / 3-day / 1-week filters slice that data on the client, with no extra request.
- **Per-user isolation:** every task queryset is filtered by `owner=request.user`. Tests must check that one user
  can't read or change another user's tasks (expect 404, not 403).
- `Task` fields: `owner`, `title` (≤200), `description`, `priority` (`LOW|MEDIUM|HIGH|URGENT`), `is_completed`,
  `completed_at`, `due_date`, `is_outdoor`, timestamps. Index on (`owner`, `is_completed`, `priority`).
- API is versioned under `/api/v1/`. DRF throttling applies to the auth and weather endpoints.

## Delivery phases

1. Scaffolding: Docker Compose, CI, linting, health endpoint
2. Backend auth + tasks CRUD
3. Backend weather proxy + Redis cache
4. Frontend auth + TODO UI
5. Frontend weather panel + filters
6. Production compose/Nginx, Postman collection (`docs/postman/`), polish

## Commands

_To be filled in during Phase 1._ Planned entry point: `docker compose up --build`.
