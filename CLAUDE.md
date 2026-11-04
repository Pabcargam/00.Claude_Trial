# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TODO + Weather Planner**: a multi-user web app with a prioritised TODO list next to a weather forecast
(location search with autocomplete; filters for Today / 3 days / 1 week), so users can plan outdoor chores.
See `README.md` for features, the planned API and the roadmap.

**Current state:** Phase 1 (scaffolding) is done: health endpoint, custom User model, app shell, Docker Compose, CI.
Keep the *Commands* section accurate. Do not document commands that don't work yet.

## Role and working agreement

The user (Pablo, GitHub `Pabcargam`) is the lead engineer and architect. Claude acts as a **senior full-stack developer**:
HTML/CSS/JavaScript/React on the frontend; Python/Django/DRF, Go, REST APIs, PostgreSQL/SQL, NoSQL (Redis),
Docker, Postman and GitHub on the backend. New technologies are added only when the plan needs them, and after discussing them with Pablo.

- Be meticulous: re-read and re-check finished work before reporting it done.
- Every change ships with tests, and the tests are **run**, not just written. Report failures honestly.
- Refactor when it makes the code clearer, but keep refactors separate from feature changes.
- Architecture or stack changes go to Pablo for a decision first. Don't silently diverge from the agreed design.
- Pablo is experienced in backend and DevOps (Django, Docker, Kubernetes, CI/CD), so skip the basics there. Pablo is
  learning Claude Code, so briefly explaining Claude Code features or workflows when they come up is useful.
- **Keep `README.md` current.** Every phase or feature that changes setup, commands, the API, the architecture or the
  roadmap updates the README in the same branch: tick roadmap items, replace "planned" sections with real instructions.

## Explain every file change

Pablo wants to understand the reason behind every change, not just see the result.

- **Before creating or editing any file**, write a short explanation in the message right before the tool call, so it
  sits next to the permission prompt. Use this format:
  **`path/to/file`**: what the file is for (one line) → what this change does and why (one or two lines).
- Batched changes: when several related files are written together (for example a new Django app), give one explanation
  per file in a compact list before the batch, not one long paragraph.
- Generated or tool-modified files (migrations, lockfiles, formatter fixes) get a one-line note saying which command
  produced them and why.
- Keep it short and concrete. Explain the *why* (design reason, trade-off, which rule or phase it serves), not just the obvious *what*.

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

- **Frontend** (`frontend/`): React 19 + Vite 8, **plain JavaScript (not TypeScript)**, TanStack Query, Axios, CSS Modules
  (React Router arrives with auth). Tests: Vitest + React Testing Library + MSW.
- **Backend** (`backend/`): Django 6.1 + DRF; project package `config/`; apps `accounts/`, `tasks/`, `weather/`.
  SimpleJWT (access 15 min, refresh 7 days, rotation and blacklist), drf-spectacular (Swagger at `/api/docs/`),
  django-environ, django-cors-headers. Tests: pytest + pytest-django + factory_boy + `responses`. Coverage target ≥ 90%.
- **Infra**: `docker-compose.yml` (dev, hot reload) and `docker-compose.prod.yml` (gunicorn + Nginx serving the built SPA);
  GitHub Actions CI runs lint and tests for both sides. Config comes from `.env` (template in `.env.example`).
- **Quality**: Ruff (Python), oxlint + Prettier (JS), pre-commit (`.pre-commit-config.yaml`).

### How the pieces fit
- **Same-origin API.** The SPA calls relative `/api/v1/...` (`frontend/src/api/client.js`). Vite proxies `/api` to Django in dev
  (`VITE_API_PROXY_TARGET`, `http://backend:8000` in Compose); Nginx will do the same in prod. So CORS is only a fallback.
- **Settings** live in `backend/config/settings/{base,dev,test,prod}.py`. Everything that changes per environment comes from env vars
  (django-environ). `base.py` *requires* `DJANGO_SECRET_KEY`, `DATABASE_URL` and `REDIS_URL`. `test.py` sets defaults for them
  (SQLite in memory, local-memory cache) so `pytest` runs with no services; CI sets `DATABASE_URL` to PostgreSQL.
  `manage.py` defaults to `dev`, `wsgi`/`asgi` to `prod`.
- **`AUTH_USER_MODEL = "accounts.User"`**: email is the login (no username). Always use `get_user_model()` / `settings.AUTH_USER_MODEL`.
- DRF defaults to `IsAuthenticated` and JSON-only rendering. Public endpoints (like health) opt out explicitly.
  Every new view needs `extend_schema` where the schema can't be inferred, and `check --deploy` must stay warning-free
  (drf-spectacular warnings count).
- New API apps are mounted in the `api_v1` list in `backend/config/urls.py`.
- Frontend tests: MSW handlers live in `src/test/server.js` (unhandled requests fail the test). Render with
  `renderWithClient` from `src/test/utils.jsx` so each test gets a fresh QueryClient.

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

```bash
docker compose up --build                 # full stack: frontend :5173, API :8000, Postgres :5433, Redis :6379
docker compose exec backend python manage.py <cmd>   # migrate, createsuperuser, makemigrations...
```

Backend (run from `backend/`, venv at `backend/.venv`, Python 3.12):
```bash
.venv/bin/pytest                                   # all tests + coverage gate (90%)
.venv/bin/pytest core/tests/test_health.py -k database --no-cov   # single test
.venv/bin/ruff check . && .venv/bin/ruff format --check .
DJANGO_SETTINGS_MODULE=config.settings.test .venv/bin/python manage.py makemigrations --check --dry-run
docker compose exec -e DATABASE_URL=postgres://todo:todo-dev-password@db:5432/todo_weather backend pytest  # on Postgres
```

Frontend (run from `frontend/`). The lockfile is written by **npm 11**. The local npm 10.9 crashes (`edgesOut` bug),
so use `npx -y npm@11 install <pkg>` when changing dependencies:
```bash
npm test                                           # Vitest once; npm run test:watch for watch mode
npx vitest run src/components/HealthBadge.test.jsx # single file
npm run coverage                                   # thresholds 90%
npm run lint && npm run format:check && npm run build
```

Before committing: `backend/.venv/bin/pre-commit run --all-files`. CI (`.github/workflows/ci.yml`) runs the same checks plus
`check --deploy` on prod settings and the Docker image builds.
