import axios from 'axios'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  notifySessionExpired,
  setTokens,
} from '../auth/tokenStore'

/**
 * Shared HTTP client. All requests go to the same origin under /api/v1:
 * Vite proxies them to Django in development and Nginx does it in production,
 * so the browser never needs CORS for our own API.
 */
export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Endpoints where a 401 means "bad credentials/token", never "access token expired".
const NO_REFRESH_PATHS = [
  '/auth/token/',
  '/auth/token/refresh/',
  '/auth/register/',
  '/auth/logout/',
]

let refreshPromise = null

/**
 * Exchange the refresh token for a new pair. Concurrent callers share one request:
 * refresh tokens rotate, so two parallel refreshes would revoke each other.
 */
export function refreshTokens() {
  if (!refreshPromise) {
    const refresh = getRefreshToken()
    refreshPromise = (
      refresh
        ? apiClient.post('/auth/token/refresh/', { refresh }).then(({ data }) => {
            setTokens(data)
            return data.access
          })
        : Promise.reject(new Error('No refresh token'))
    ).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const canRefresh =
      response?.status === 401 &&
      config &&
      !config._retried &&
      !NO_REFRESH_PATHS.includes(config.url) &&
      getRefreshToken()

    if (!canRefresh) throw error

    try {
      const access = await refreshTokens()
      config._retried = true
      config.headers.Authorization = `Bearer ${access}`
      return apiClient(config)
    } catch {
      clearTokens()
      notifySessionExpired()
      throw error
    }
  },
)
