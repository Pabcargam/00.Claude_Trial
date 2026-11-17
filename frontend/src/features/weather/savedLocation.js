/**
 * The last location each user picked, kept in this browser so the weather panel reopens
 * where they left it. One key per user: another account on the same browser starts empty.
 * Storage can be blocked or hold stale data, so every failure just means "nothing saved".
 */
const storageKey = (userId) => `todo-weather.location.${userId}`

function isLocation(value) {
  return (
    typeof value?.name === 'string' &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude)
  )
}

export function loadLocation(userId) {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(userId)))
    return isLocation(value) ? value : null
  } catch {
    return null
  }
}

export function saveLocation(userId, { id, name, admin1 = '', country = '', latitude, longitude }) {
  try {
    const location = { id, name, admin1, country, latitude, longitude }
    window.localStorage.setItem(storageKey(userId), JSON.stringify(location))
  } catch {
    // Storage full or blocked: the panel still works, it just won't remember the place.
  }
}
