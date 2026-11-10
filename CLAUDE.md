# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> [!TIP]
> 🟢 **STANDARD: reusable in every project.** This part is project-independent. Copy it unchanged into the
> CLAUDE.md of new projects.
>
> **Advice:** instead of copying it, this part can be standardised once in a higher-level CLAUDE.md. Claude Code also
> loads the CLAUDE.md files of the project's parent folders (e.g. `~/Documents/Projects/CLAUDE.md` applies to every
> project under that folder) and `~/.claude/CLAUDE.md` (applies to every project on this machine). Once it lives
> there, remove it from the project files so the rules exist in one place only.

## Working agreement

The user is Pablo (GitHub `Pabcargam`). This section describes how Pablo likes work done and how Claude works with
Pablo. It is project-independent and meant to be reused as-is in future projects.

- Be meticulous: re-read and re-check finished work before reporting it done.
- Every change ships with tests, and the tests are **run**, not just written. Report failures honestly.
- Refactor when it makes the code clearer, but keep refactors separate from feature changes.
- **One commit per logical part.** While working, notice when a part with a single purpose is finished and commit it
  before starting code with a different purpose. Never bundle a whole phase into one code commit plus one docs commit.
  - Example: a phase adding a token store, HTTP interceptors, an auth provider, a CRUD UI and its tests is at least
    three commits: auth/token (store + interceptors + provider, they are all connected), CRUD, tests.
  - Commit messages stay short and describe only that part. Every commit leaves the test suite passing.
- **Pablo approves before…** Ask first, say exactly what will happen, and treat each approval as covering only that action.
  Never silently diverge from the agreed design.
  - Architecture or stack changes.
  - New technologies, which are added only when the plan needs them.
  - Every push and every merge (including PR merges), saying which branch goes where.
  - Deleting branches. Merged branches are kept unless Pablo asks to delete them.
- **Ask instead of guessing.** When Claude doesn't know something (a requirement, a preference, a design choice,
  missing information), ask Pablo before deciding it or guessing. Only choices with an obvious, standard convention
  may go ahead without asking, and Claude says which option it picked.
- Pablo is experienced in backend and DevOps (Django, Docker, Kubernetes, CI/CD), so skip the basics there. Pablo is
  learning Claude Code, so briefly explaining Claude Code features or workflows when they come up is useful.
- **Keep docs up to date.** Every phase or feature that changes setup, commands, the API, the architecture or the
  roadmap updates `README.md` (and `CLAUDE.md` when conventions change) in the same branch.
  - Tick roadmap items and replace "planned" sections with real instructions.
  - Make one focused Edit per section (status, API table, layout, roadmap...), not one big rewrite, so each change can
    be reviewed on its own in the permission prompt.
- **Edit files directly with the Edit/Write tools, never through shell commands** (`sed`, `python` scripts, heredocs,
  `cat >>`). The permission prompt then shows Pablo exactly what is added, removed or renamed. This is mandatory
  for `README.md` and `CLAUDE.md` and applies to every hand-written file. Shell commands may only produce generated files
  (migrations, lockfiles, formatter and linter fixes).
- **Explain all the changes to Pablo.** Pablo wants to understand the reason behind every change, not just see the
  result. How depends on the permission mode Pablo is using:
  - **Normal mode (Pablo approves each edit):** before creating or editing any file, write a short explanation in the
    message right before the tool call, so it sits next to the permission prompt.
    - Format: **`path/to/file`**: what the file is for (one line) → what this change does and why (one or two lines).
    - Batched changes: when several related files are written together (for example a new Django app), give one
      explanation per file in a compact list before the batch, not one long paragraph.
    - Generated or tool-modified files (migrations, lockfiles, formatter fixes) get a one-line note saying which
      command produced them and why.
  - **Auto mode:** no per-file notes. When a subtask/step of the running plan is finished, send **one complete
    explanation** of that step: what was done (files and changes), why it was needed, and any decisions or
    trade-offs. In big phases Pablo then reads one wholesome summary per step instead of scrolling for many small texts.
  - Detecting the mode: Claude Code notifies Claude when Auto mode is turned on or off. When unsure, use normal mode.
  - In both modes keep it concrete. Explain the *why* (design reason, trade-off, which rule or phase it serves), not
    just the obvious *what*.

> [!WARNING]
> 🟠 **PROJECT-SPECIFIC: rewrite for every new project.** Everything from here to the end of the file describes
> this project only (its goal, roles, workflow, architecture and commands).

## Project

**TODO + Weather Planner**: a multi-user web app with a prioritised TODO list next to a weather forecast
(location search with autocomplete; filters for Today / 3 days / 1 week), so users can plan outdoor chores.
See `README.md` for features, the planned API and the roadmap.

**Current state:** Phases 1–4 are done: the backend is complete (JWT auth in `accounts`, tasks CRUD in `tasks`,
cached Open-Meteo proxy in `weather`) and the frontend has auth plus the full TODO UI. Next: Phase 5 (weather panel).
Keep the *Commands* section accurate. Do not document commands that don't work yet.

## Role

- **Pablo:** lead engineer and architect. Makes the design and stack decisions.
- **Claude:** **senior full-stack developer**. HTML/CSS/JavaScript/React on the frontend; Python/Django/DRF, Go,
  REST APIs, PostgreSQL/SQL, NoSQL (Redis), Docker, Postman and GitHub on the backend.

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
- Commit often, one logical part per commit (see *Working agreement → One commit per logical part*). Use Conventional Commits with a scope where useful
  (`feat(tasks): add priority filter`, `fix(weather): handle empty geocoding result`, `test:`, `refactor:`, `docs:`, `chore:`, `ci:`).
  The subject is imperative and ≤ 72 chars, and the body explains *why* when that isn't obvious. Never commit failing tests or secrets.
- Committing on a short-lived branch needs no approval. Pushes and merges do (see *Working agreement*).
- `main`, `qa` and `develop` are **protected by a GitHub ruleset** (`Protect_Long_Live_Branches`): every change needs a PR,
  force-pushes and branch deletion are blocked, and 0 approvals are required. A direct `git push` to them **will be rejected**,
  so always work on a short-lived branch and open a PR (`gh pr create --base develop`) with a summary and test evidence.
- Merge methods: **squash** for short-lived branches into `develop` (one clean commit per feature). **Merge commit** (`gh pr merge --merge`)
  for promotions `develop → qa → main` and hotfix back-merges, so the long-lived branches share history and don't diverge.
- Merged short-lived branches stay on GitHub. Deleting them is an approval item (see *Working agreement*).

## Agreed architecture

```
React SPA (Vite, JavaScript) ──► Nginx (prod) ──► Django + DRF (gunicorn)
                                                   ├── PostgreSQL 16  (users, tasks)
                                                   ├── Redis 7        (weather cache, throttling)
                                                   └── Open-Meteo     (geocoding + forecast, no API key)
```

- **Frontend** (`frontend/`): React 19 + Vite 8, **plain JavaScript (not TypeScript)**, React Router 8, TanStack Query,
  Axios, CSS Modules. Tests: Vitest + React Testing Library + MSW.
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
- **`AUTH_USER_MODEL = "accounts.User"`**: email is the login (no username).
  `UserManager.normalize_email` lowercases the whole email and `get_by_natural_key` uses `iexact`.
- **Auth:** JWT is the only authentication class. Throttling is opt-in per view through `throttle_scope`
  (`auth` = register + login, 10/min; `weather` = both weather views, 60/min per user). Throttle counters live in the cache.
- **Task priority** is a `PositiveSmallIntegerField` with `Priority` IntegerChoices (1–4), so ordering is numeric.
  The API exposes names (`LOW`…`URGENT`, case-insensitive on input) through `tasks.serializers.PriorityField` and
  `tasks.filters.TaskFilter`.
- **Owner scoping:** owned resources filter `get_queryset()` by `request.user` and set the owner in `perform_create`.
- **Weather** has three layers and no models. `weather/client.py` does the HTTP calls and turns every upstream failure into
  `WeatherServiceUnavailable` (503). `weather/services.py` normalises Open-Meteo's parallel arrays into daily/hourly rows
  (WMO codes → description + icon via `weather/codes.py`) and caches them. `weather/views.py` only validates query
  params. The forecast cache key uses coordinates rounded to 2 decimals; one 7-day entry serves `days=1|3|7`.
  Settings live in `settings.WEATHER`.
- **Backend tests:** shared fixtures in `backend/conftest.py` (`api_client`, `user`, `auth_client`; the cache is cleared
  around every test). Factories live in each app's `tests/factories.py`. `filterwarnings = ["error"]`: any warning fails
  the run. `core/tests/test_health.py` regenerates the OpenAPI schema with `--fail-on-warn`. Weather tests use the
  `mock_open_meteo` fixture (`weather/tests/conftest.py`) and payloads in `weather/tests/payloads.py`.
- DRF defaults to `IsAuthenticated` and JSON-only rendering. Public endpoints (like health) opt out explicitly.
- New API apps are mounted in the `api_v1` list in `backend/config/urls.py`.
- **Frontend auth:** `src/auth/tokenStore.js` keeps the access token in memory and the refresh token in
  `localStorage` (key `todo-weather.refresh`). The interceptors in `src/api/client.js` add `Bearer`, and on a 401
  refresh **once** (a single shared `refreshPromise`) and retry. A failed refresh clears the tokens and fires
  `onSessionExpired`. `AuthProvider` restores the session on load (`status: loading → authenticated | anonymous`),
  and logout/expiry clears the TanStack Query cache. `RequireAuth` / `GuestOnly` in `src/auth/RouteGuards.jsx` guard
  routes. `displayName(user)` = first name or email local part.
- **Frontend tasks** (`src/features/tasks/`): `TasksPanel` renders two cards, `TaskForm` ("New task") and the list
  card ("Your tasks"), with `TaskFilters` in a toolbar. `TaskItem` is a 3-column grid (checkbox | title + tags |
  icon actions). Only the middle wraps, so the actions stay aligned in every row. The modes are view, edit and
  confirm-delete. Completed tasks have edit disabled; delete always works. Hooks in `useTasks.js` invalidate
  `['tasks']` after writes, and the list keeps the server's order. Inputs, selects and buttons share one height
  (`index.css`).
- **Frontend tests** run the whole app (`renderApp({ route })` in `src/test/utils.jsx`) against
  `src/test/fakeApi.js`, an in-memory MSW fake that mirrors the backend contract: rotation, blacklist, ownership 404s,
  filters, ordering and read-only completed tasks. Helpers: `signIn`, `seedUser`, `seedTask`, `expireAccessTokens`,
  `expireSession`. `src/test/setup.js` resets the fake API, the tokens and `localStorage` after every test.
  Unhandled requests fail the test.

### Key design rules
- **The frontend never calls Open-Meteo directly.** The `weather` app proxies it, normalises the response and caches it
  in Redis (15 min per rounded lat/lon; searches 24 h). Only `weather/client.py` may make HTTP calls to Open-Meteo.
  Never cache failures. Never hit the real API in tests: use the `mock_open_meteo` fixture, which turns any unmocked
  request into an error.
- **"Real-time" weather** means a debounced (~300 ms) location autocomplete. Picking a location fetches a 7-day
  forecast **once**. The Today / 3-day / 1-week filters slice that data on the client, with no extra request.
- **Per-user isolation:** every task queryset is filtered by `owner=request.user`. Tests must check that one user
  can't read or change another user's tasks (expect 404, not 403). Owner-scoped views must return
  `Model.objects.none()` when `swagger_fake_view` is set, or OpenAPI generation fails.
- **User model:** always reference it through `get_user_model()` / `settings.AUTH_USER_MODEL`. Keep both
  `UserManager.normalize_email` (full lowercase) and the `iexact` `get_by_natural_key`, or duplicate accounts that
  differ only by letter case become possible.
- **Priority** is numeric in the database. Never sort or compare priorities as strings.
- **Completed tasks are read-only until reopened.** `TaskSerializer.validate` returns 400 for any change to a
  completed task unless the request sets `is_completed: false`; deleting is always allowed. The UI reflects this
  (edit disabled) but never replaces the API rule.
- **Token storage** (Pablo's decision): access token in memory only, refresh token in `localStorage`. Don't move tokens
  (e.g. to `httpOnly` cookies, planned for Phase 6) without Pablo's approval.
- **No native browser dialogs** (`window.confirm`, `alert`, `prompt`): browsers can block or auto-dismiss them, which
  broke deleting once. Use in-app UI (e.g. the inline delete confirmation).
- **`src/test/fakeApi.js` mirrors the backend contract.** Any backend change to endpoints, validation or ordering
  updates the fake in the same branch, or the frontend tests drift from reality.
- **API schema:** every new view gets `extend_schema` where the schema can't be inferred. `check --deploy` must stay
  warning-free (drf-spectacular warnings count).
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
docker compose up -d --build -V frontend  # after frontend dependency changes (-V renews the node_modules volume)
docker compose exec db psql -U todo -d todo_weather -c "SELECT * FROM tasks_task;"   # check data in PostgreSQL
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
npx vitest run src/features/tasks/TasksPanel.test.jsx  # single file
npm run coverage                                   # thresholds 90%
npm run lint && npm run format:check && npm run build
```

Before committing: `backend/.venv/bin/pre-commit run --all-files`. CI (`.github/workflows/ci.yml`) runs the same checks plus
`check --deploy` on prod settings and the Docker image builds.
