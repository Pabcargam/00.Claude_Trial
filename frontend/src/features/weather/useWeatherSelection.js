import { useCallback, useState } from 'react'
import { loadLocation, saveLocation } from './savedLocation'

/**
 * What the weather cards show, for the signed-in user: the picked location (restored from
 * this browser on load). Lives in the dashboard because several cards share it.
 */
export function useWeatherSelection(userId) {
  const [location, setLocation] = useState(() => loadLocation(userId))

  const selectLocation = useCallback(
    (next) => {
      saveLocation(userId, next)
      setLocation(next)
    },
    [userId],
  )

  return { location, selectLocation }
}
