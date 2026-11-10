/**
 * In-memory fake of our Django API for frontend tests (MSW handlers).
 *
 * Mirrors the real contract: JWT access/refresh tokens with rotation and logout
 * blacklisting, per-user task ownership (404 for other users' tasks), filters,
 * search and the server's ordering (open first, then most urgent).
 */
import { http, HttpResponse } from 'msw'
import { setTokens } from '../auth/tokenStore'

const API = '/api/v1'
const PRIORITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }

let db
let counter

export function resetFakeApi() {
  db = {
    users: [], // { id, email, password, first_name, last_name }
    tasks: [], // API shape + owner
    access: new Map(), // token -> userId
    refresh: new Map(), // token -> userId (valid ones only)
    calls: { refresh: 0 },
  }
  counter = 0
}
resetFakeApi()

const nextId = () => ++counter

function issueTokens(userId) {
  const n = nextId()
  const pair = { access: `access-${n}`, refresh: `refresh-${n}` }
  db.access.set(pair.access, userId)
  db.refresh.set(pair.refresh, userId)
  return pair
}

function publicUser({ id, email, first_name, last_name }) {
  return { id, email, first_name, last_name, date_joined: '2026-11-10T09:00:00Z' }
}

function currentUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  const userId = db.access.get(token)
  return db.users.find((u) => u.id === userId) ?? null
}

const unauthorized = () =>
  HttpResponse.json({ detail: 'Given token not valid for any token type' }, { status: 401 })
const notFound = () =>
  HttpResponse.json({ detail: 'No Task matches the given query.' }, { status: 404 })

function serverOrder(a, b) {
  return (
    Number(a.is_completed) - Number(b.is_completed) ||
    PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
    b.id - a.id
  )
}

function taskForResponse({ owner: _owner, ...task }) {
  return task
}

// --- helpers for tests ------------------------------------------------------------------

export function seedUser({
  email = 'pablo@example.com',
  password = 'Sup3r-secret!',
  firstName = '',
} = {}) {
  const user = { id: nextId(), email, password, first_name: firstName, last_name: '' }
  db.users.push(user)
  return user
}

export function seedTask(user, overrides = {}) {
  const task = {
    id: nextId(),
    owner: user.id,
    title: `Task ${counter}`,
    description: '',
    priority: 'MEDIUM',
    is_completed: false,
    completed_at: null,
    due_date: null,
    is_outdoor: false,
    created_at: '2026-11-10T09:00:00Z',
    updated_at: '2026-11-10T09:00:00Z',
    ...overrides,
  }
  if (task.is_completed && !task.completed_at) task.completed_at = '2026-11-10T10:00:00Z'
  db.tasks.push(task)
  return task
}

/** A stored refresh token, as after a previous visit: the app restores the session on start. */
export function signIn(options) {
  const user = seedUser(options)
  const { refresh } = issueTokens(user.id)
  setTokens({ access: null, refresh })
  return user
}

/** The 15-minute access tokens ran out; refresh tokens still work. */
export function expireAccessTokens() {
  db.access.clear()
}

/** Both tokens are gone server-side (e.g. refresh expired after 7 days). */
export function expireSession() {
  db.access.clear()
  db.refresh.clear()
}

export const fakeApi = {
  get calls() {
    return db.calls
  },
  get tasks() {
    return db.tasks
  },
}

// --- handlers --------------------------------------------------------------------------------

export const fakeApiHandlers = [
  http.post(`${API}/auth/register/`, async ({ request }) => {
    const { email = '', password = '', first_name = '' } = await request.json()
    const errors = {}
    if (!email) errors.email = ['This field is required.']
    else if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      errors.email = ['A user with this email already exists.']
    }
    if (password.length < 8) {
      errors.password = ['This password is too short. It must contain at least 8 characters.']
    }
    if (Object.keys(errors).length) return HttpResponse.json(errors, { status: 400 })
    const user = seedUser({ email: email.toLowerCase(), password, firstName: first_name })
    return HttpResponse.json(publicUser(user), { status: 201 })
  }),

  http.post(`${API}/auth/token/`, async ({ request }) => {
    const { email = '', password } = await request.json()
    const user = db.users.find((u) => u.email === email.toLowerCase() && u.password === password)
    if (!user) {
      return HttpResponse.json(
        { detail: 'No active account found with the given credentials' },
        { status: 401 },
      )
    }
    return HttpResponse.json(issueTokens(user.id))
  }),

  http.post(`${API}/auth/token/refresh/`, async ({ request }) => {
    db.calls.refresh += 1
    const { refresh } = await request.json()
    const userId = db.refresh.get(refresh)
    if (!userId) {
      return HttpResponse.json(
        { detail: 'Token is blacklisted', code: 'token_not_valid' },
        { status: 401 },
      )
    }
    db.refresh.delete(refresh) // rotation: the old refresh token is revoked
    return HttpResponse.json(issueTokens(userId))
  }),

  http.post(`${API}/auth/logout/`, async ({ request }) => {
    const { refresh } = await request.json()
    if (!db.refresh.delete(refresh)) {
      return HttpResponse.json({ detail: 'Token is blacklisted' }, { status: 400 })
    }
    return new HttpResponse(null, { status: 205 })
  }),

  http.get(`${API}/auth/me/`, ({ request }) => {
    const user = currentUser(request)
    return user ? HttpResponse.json(publicUser(user)) : unauthorized()
  }),

  http.get(`${API}/tasks/`, ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const params = new URL(request.url).searchParams
    let tasks = db.tasks.filter((t) => t.owner === user.id)
    if (params.has('completed')) {
      tasks = tasks.filter((t) => t.is_completed === (params.get('completed') === 'true'))
    }
    const priorities = params.getAll('priority')
    if (priorities.length) tasks = tasks.filter((t) => priorities.includes(t.priority))
    const search = params.get('search')?.toLowerCase()
    if (search) {
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(search) || t.description.toLowerCase().includes(search),
      )
    }
    const results = [...tasks].sort(serverOrder).map(taskForResponse)
    return HttpResponse.json({ count: results.length, next: null, previous: null, results })
  }),

  http.post(`${API}/tasks/`, async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const body = await request.json()
    const title = (body.title ?? '').trim()
    if (!title)
      return HttpResponse.json({ title: ['This field may not be blank.'] }, { status: 400 })
    const task = seedTask(user, { ...body, title })
    return HttpResponse.json(taskForResponse(task), { status: 201 })
  }),

  http.patch(`${API}/tasks/:id/`, async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const task = db.tasks.find((t) => t.id === Number(params.id) && t.owner === user.id)
    if (!task) return notFound()
    const changes = await request.json()
    // Same rule as the backend serializer: completed tasks are read-only until reopened.
    const edits = Object.keys(changes).filter((key) => key !== 'is_completed')
    if (task.is_completed && changes.is_completed !== false && edits.length) {
      return HttpResponse.json(
        { non_field_errors: ["Completed tasks can't be edited. Reopen the task first."] },
        { status: 400 },
      )
    }
    Object.assign(task, changes)
    if ('is_completed' in changes) {
      task.completed_at = task.is_completed ? '2026-11-10T12:00:00Z' : null
    }
    return HttpResponse.json(taskForResponse(task))
  }),

  http.delete(`${API}/tasks/:id/`, ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const index = db.tasks.findIndex((t) => t.id === Number(params.id) && t.owner === user.id)
    if (index === -1) return notFound()
    db.tasks.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
