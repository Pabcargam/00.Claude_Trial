/**
 * Where the JWTs live (decision recorded in CLAUDE.md):
 * - access token (15 min): memory only, gone on reload, never readable from storage
 * - refresh token (7 days, rotated): localStorage, so a reload keeps the user logged in
 *
 * Storage can be unavailable (private mode, blocked site data), so every access is guarded.
 */

const REFRESH_KEY = 'todo-weather.refresh'

let accessToken = null
const expiredListeners = new Set()

function readStorage() {
  try {
    return window.localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

function writeStorage(value) {
  try {
    if (value) window.localStorage.setItem(REFRESH_KEY, value)
    else window.localStorage.removeItem(REFRESH_KEY)
  } catch {
    // Without storage the session simply won't survive a reload.
  }
}

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return readStorage()
}

export function setTokens({ access, refresh }) {
  accessToken = access ?? null
  if (refresh !== undefined) writeStorage(refresh)
}

export function clearTokens() {
  accessToken = null
  writeStorage(null)
}

/** Subscribe to "the session could not be refreshed". Returns an unsubscribe function. */
export function onSessionExpired(listener) {
  expiredListeners.add(listener)
  return () => expiredListeners.delete(listener)
}

export function notifySessionExpired() {
  expiredListeners.forEach((listener) => listener())
}
