import { apiClient } from './client'

/** Places matching `query` (at least 2 characters), best match first. */
export async function searchLocations(query) {
  const { data } = await apiClient.get('/weather/locations/', { params: { q: query } })
  return data
}

/**
 * The full 7-day forecast for a location. The Today / 3 days / 1 week filters slice it on
 * the client, so switching filters never sends another request.
 */
export async function fetchForecast({ latitude, longitude }) {
  const { data } = await apiClient.get('/weather/forecast/', {
    params: { lat: latitude, lon: longitude, days: 7 },
  })
  return data
}
