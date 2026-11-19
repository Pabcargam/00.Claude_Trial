import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchForecast, searchLocations } from '../../api/weather'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { rainLevel } from './rain'

export const MIN_QUERY_LENGTH = 2 // the backend rejects shorter searches
const SEARCH_DELAY_MS = 300
// Same lifetimes as the backend cache: refetching sooner would only return the cached copy.
const SEARCH_FRESH_MS = 24 * 60 * 60 * 1000
const FORECAST_FRESH_MS = 15 * 60 * 1000

/** Autocomplete: searches once typing pauses for 300 ms and the text has 2+ characters. */
export function useLocationSearch(text) {
  const query = useDebouncedValue(text.trim(), SEARCH_DELAY_MS)
  const enabled = query.length >= MIN_QUERY_LENGTH
  const result = useQuery({
    queryKey: ['weather', 'locations', query.toLowerCase()],
    queryFn: () => searchLocations(query),
    enabled,
    staleTime: SEARCH_FRESH_MS,
    placeholderData: keepPreviousData, // keep the old suggestions while the next ones load
  })
  return { ...result, enabled }
}

/** The 7-day forecast of `location`, or an idle query while no location is picked. */
export function useForecast(location) {
  return useQuery({
    queryKey: ['weather', 'forecast', location?.latitude, location?.longitude],
    queryFn: () => fetchForecast(location),
    enabled: Boolean(location),
    staleTime: FORECAST_FRESH_MS,
  })
}

/**
 * Rainy days of the whole 7-day forecast (not just the range on screen), as a Map of
 * "YYYY-MM-DD" → { probability, level }. Empty while no place is picked or loading.
 * Same query as the weather card, so it never sends a request of its own.
 */
export function useRainWarnings(location) {
  const { data } = useForecast(location)
  return useMemo(() => {
    const warnings = new Map()
    for (const day of data?.daily ?? []) {
      const level = rainLevel(day.precipitation_probability)
      if (level) warnings.set(day.date, { probability: day.precipitation_probability, level })
    }
    return warnings
  }, [data])
}
