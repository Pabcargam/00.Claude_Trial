/**
 * In-memory fake of our Django API for frontend tests (MSW handlers).
 *
 * Mirrors the real contract: JWT access/refresh tokens with rotation and logout
 * blacklisting, per-user task ownership (404 for other users' tasks), filters,
 * search and the server's ordering (open first, then most urgent), and the weather
 * proxy (location search, normalised 7-day forecast sliced by `days`, 503 when down).
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
    calls: { refresh: 0, forecast: 0 },
    weatherDown: false,
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

/** Open-Meteo is unreachable: both weather endpoints answer 503, like the backend proxy. */
export function failWeather() {
  db.weatherDown = true
}

export function restoreWeather() {
  db.weatherDown = false
}

export const fakeApi = {
  get calls() {
    return db.calls
  },
  get tasks() {
    return db.tasks
  },
}

// --- weather fixtures (the backend's normalised shape, see weather/services.py) ---------------

export const LOCATIONS = [
  {
    id: 2510911,
    name: 'Seville',
    admin1: 'Andalusia',
    country: 'Spain',
    country_code: 'ES',
    latitude: 37.38283,
    longitude: -5.97317,
    timezone: 'Europe/Madrid',
  },
  {
    id: 3668605,
    name: 'Sevilla',
    admin1: 'Valle del Cauca',
    country: 'Colombia',
    country_code: 'CO',
    latitude: 4.26667,
    longitude: -75.93333,
    timezone: 'America/Bogota',
  },
  {
    id: 3117735,
    name: 'Madrid',
    admin1: 'Madrid',
    country: 'Spain',
    country_code: 'ES',
    latitude: 40.4165,
    longitude: -3.70256,
    timezone: 'Europe/Madrid',
  },
]

const CONDITIONS = [
  { weather_code: 0, description: 'Clear sky', icon: 'clear' },
  { weather_code: 61, description: 'Slight rain', icon: 'rain' },
  { weather_code: 2, description: 'Partly cloudy', icon: 'partly-cloudy' },
  { weather_code: 3, description: 'Overcast', icon: 'cloudy' },
]

// 7 days from 2026-11-10 (the fake's "today"), 24 hours each.
const FORECAST_DATES = Array.from({ length: 7 }, (_, i) => `2026-11-${String(10 + i)}`)

// Hourly conditions: "sun" icons at night (00:00, 01:00) and by day (12:00, 13:00) to check the
// moon/sun icons; every other hour is overcast.
const HOURLY_CONDITIONS = {
  0: CONDITIONS[0],
  1: CONDITIONS[2],
  12: CONDITIONS[0],
  13: CONDITIONS[2],
}

function hourlyRow(date, h, dayIndex) {
  const row = {
    time: `${date}T${String(h).padStart(2, '0')}:00`,
    temperature: 8 + h / 2,
    precipitation_probability: h === 23 ? null : h,
    wind_speed: 5 + h / 4,
    ...(HOURLY_CONDITIONS[h] ?? CONDITIONS[3]),
  }
  // Sun up 08:00–17:59 (Madrid in November). The last day has no flag at all, like a forecast
  // cached before the backend sent is_day: it must show day icons.
  if (dayIndex < 6) row.is_day = h >= 8 && h < 18
  return row
}

// Daily rain chance, 2026-11-10 … 16. Hits the rain-warning boundaries exactly: 30% (Fri 13)
// is "possible", 60% (Sun 15) is "likely". The last day has none (Open-Meteo can omit it).
const DAILY_RAIN = [0, 10, 20, 30, 50, 60, null]

function fullForecast(latitude, longitude) {
  return {
    location: { latitude, longitude, timezone: 'Europe/Madrid', elevation: 10 },
    units: { temperature: '°C', wind_speed: 'km/h', precipitation: 'mm', probability: '%' },
    current: {
      time: '2026-11-10T12:00',
      temperature: 19.4,
      wind_speed: 8,
      is_day: true,
      ...CONDITIONS[0],
    },
    daily: FORECAST_DATES.map((date, i) => ({
      date,
      temperature_max: 20.4 + i,
      temperature_min: 9.6 + i,
      precipitation_probability: DAILY_RAIN[i],
      precipitation_sum: i,
      wind_speed_max: 10.4 + i,
      ...CONDITIONS[i % CONDITIONS.length],
    })),
    hourly: FORECAST_DATES.flatMap((date, dayIndex) =>
      Array.from({ length: 24 }, (_, h) => hourlyRow(date, h, dayIndex)),
    ),
  }
}

const weatherUnavailable = () =>
  HttpResponse.json(
    { detail: 'The weather service is temporarily unavailable. Please try again shortly.' },
    { status: 503 },
  )

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

  http.get(`${API}/weather/locations/`, ({ request }) => {
    if (!currentUser(request)) return unauthorized()
    const q = (new URL(request.url).searchParams.get('q') ?? '').trim()
    if (q.length < 2) {
      return HttpResponse.json(
        { q: ['Ensure this field has at least 2 characters.'] },
        { status: 400 },
      )
    }
    if (db.weatherDown) return weatherUnavailable()
    const prefix = q.toLowerCase()
    return HttpResponse.json(LOCATIONS.filter((l) => l.name.toLowerCase().startsWith(prefix)))
  }),

  http.get(`${API}/weather/forecast/`, ({ request }) => {
    if (!currentUser(request)) return unauthorized()
    db.calls.forecast += 1
    const params = new URL(request.url).searchParams
    const lat = Number(params.get('lat'))
    const lon = Number(params.get('lon'))
    const days = Number(params.get('days') ?? 7)
    const errors = {}
    if (!params.has('lat') || !(Math.abs(lat) <= 90)) errors.lat = ['A valid number is required.']
    if (!params.has('lon') || !(Math.abs(lon) <= 180)) errors.lon = ['A valid number is required.']
    if (![1, 3, 7].includes(days)) errors.days = [`"${params.get('days')}" is not a valid choice.`]
    if (Object.keys(errors).length) return HttpResponse.json(errors, { status: 400 })
    if (db.weatherDown) return weatherUnavailable()
    // Same slicing as services.get_forecast: first `days` days and their hours.
    const forecast = fullForecast(lat, lon)
    const daily = forecast.daily.slice(0, days)
    const dates = new Set(daily.map((d) => d.date))
    const hourly = forecast.hourly.filter((h) => dates.has(h.time.slice(0, 10)))
    return HttpResponse.json({ ...forecast, days, daily, hourly })
  }),
]
