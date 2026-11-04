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
- **Keep `README.md` current.** Every phase or feature that changes setup, commands, the API, the architecture or the
  roadmap updates the README in the same branch: tick roadmap items, replace "planned" sections with real instructions.

## Git workflow

Work like a senior developer on a team. The branch model is documented in `README.md` → *Branching strategy*.

**Long-lived branches**
- `main`: production-ready code only. Every merge into it is a release and gets a tag (`vX.Y.Z`). Deployments come from here.
- `develop`: integration branch. Every feature/fix branch starts from it and goes back into it.
- `qa`: testing/staging. `develop` is promoted here for QA. A green `qa` is merged into `main`.

**Short-lived branches** (start from `develop` unless noted; kebab-case; one purpose per branch)
- `feature/<short-name>`: new functionality, e.g. `feature/tasks-crud`
- `fix/<short-name>`: non-urgent bug fixes
- `refactor/`, `test/`, `docs/`, `chore/`, `ci/`: changes that are not features
- `hotfix/<short-name>`: urgent production fix. Starts from `main` and is merged back into both `main` and `develop`.

**Flow:** `feature/*` → `develop` → `qa` → `main` (tag).

**Rules for Claude**
- Run `git pull` on the base branch before creating a branch and before merging. Rebase or merge `develop` into long-running
  feature branches regularly.
- Commit often, in small logical steps. Use Conventional Commits with a scope where useful
  (`feat(tasks): add priority filter`, `fix(weather): handle empty geocoding result`, `test:`, `refactor:`, `docs:`, `chore:`, `ci:`).
  The subject is imperative and ≤ 72 chars, and the body explains *why* when that isn't obvious. Never commit failing tests or secrets.
- Committing on a short-lived branch needs no approval. **Always ask Pablo before every push and every merge**
  (including PR merges), and say which branch goes where. Approval covers only the action asked about.
- `main`, `qa` and `develop` are **protected by a GitHub ruleset** (`Protect_Long_Live_Branches`): every change needs a PR,
  force-pushes and branch deletion are blocked, and 0 approvals are required. A direct `git push` to them **will be rejected**,
  so always work on a short-lived branch and open a PR (`gh pr create --base develop`) with a summary and test evidence.
- Merge methods: **squash** for short-lived branches into `develop` (one clean commit per feature). **Merge commit** (`gh pr merge --merge`)
  for promotions `develop → qa → main` and hotfix back-merges, so the long-lived branches share history and don't diverge.
- Delete merged short-lived branches (after asking).

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

Each phase runs on its own `feature/*` branch (or several) from `develop`, and ends with the README updated.

## Commands

_To be filled in during Phase 1._ Planned entry point: `docker compose up --build`.
