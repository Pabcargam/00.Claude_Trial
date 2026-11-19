import { apiClient } from './client'

/**
 * Returns the backend health payload: { status, database, cache }.
 * A degraded backend answers 503 with the same body, so we return it
 * instead of throwing; only network errors and other statuses throw.
 */
export async function fetchHealth() {
  const response = await apiClient.get('/health/', {
    validateStatus: (status) => status === 200 || status === 503,
  })
  return response.data
}
