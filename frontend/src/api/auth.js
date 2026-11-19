import { clearTokens, getRefreshToken, setTokens } from '../auth/tokenStore'
import { apiClient, refreshTokens } from './client'

export async function register({ email, password, firstName, lastName }) {
  const { data } = await apiClient.post('/auth/register/', {
    email,
    password,
    first_name: firstName ?? '',
    last_name: lastName ?? '',
  })
  return data
}

export async function login({ email, password }) {
  const { data } = await apiClient.post('/auth/token/', { email, password })
  setTokens(data)
  return fetchMe()
}

export async function fetchMe() {
  const { data } = await apiClient.get('/auth/me/')
  return data
}

/** Revoke the refresh token server-side, then forget both tokens even if that call fails. */
export async function logout() {
  const refresh = getRefreshToken()
  try {
    if (refresh) await apiClient.post('/auth/logout/', { refresh })
  } catch {
    // Already invalid or network down: the local session is cleared anyway.
  } finally {
    clearTokens()
  }
}

/** After a reload only the refresh token survives: trade it for an access token and the user. */
export async function restoreSession() {
  if (!getRefreshToken()) return null
  try {
    await refreshTokens()
    return await fetchMe()
  } catch {
    clearTokens()
    return null
  }
}
