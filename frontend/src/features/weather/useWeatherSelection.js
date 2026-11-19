import { useCallback, useState } from 'react'
import { loadLocation, saveLocation } from './savedLocation'

/**
 * What the weather cards show, for the signed-in user: the picked location (restored from
 * this browser on load), the forecast range in days (1, 3 or 7; Today by default) and the
 * day opened in the 24-hour card (a "YYYY-MM-DD" date, or null).
 * Lives in the dashboard because the weather card and the day card share it.
 */
export function useWeatherSelection(userId) {
  const [location, setLocation] = useState(() => loadLocation(userId))
  const [days, setDays] = useState(1)
  const [selectedDate, setSelectedDate] = useState(null)

  const selectLocation = useCallback(
    (next) => {
      saveLocation(userId, next)
      setLocation(next)
      setSelectedDate(null) // another place: the open day no longer applies
    },
    [userId],
  )

  return { location, selectLocation, days, setDays, selectedDate, setSelectedDate }
}
