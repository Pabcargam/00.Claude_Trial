/** "Seville, Andalusia, Spain": the non-empty parts of a location, without repeats. */
export function placeLabel({ name, admin1, country }) {
  return [...new Set([name, admin1, country].filter(Boolean))].join(', ')
}

// The backend's icon keys (weather/codes.py) as emoji.
const EMOJI = {
  clear: '☀️',
  'partly-cloudy': '⛅',
  cloudy: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  'freezing-rain': '🌧️',
  showers: '🌦️',
  snow: '🌨️',
  thunderstorm: '⛈️',
}

export function weatherEmoji(icon) {
  return EMOJI[icon] ?? '❔'
}

/** 17.6 → "18°" */
export function degrees(value) {
  return `${Math.round(value)}°`
}

/** 40 → "40%"; Open-Meteo sometimes has no probability (null) → "–", without a unit. */
export function percent(value, unit) {
  return value == null ? '–' : `${value}${unit}`
}

// API dates are the location's calendar dates ("2026-11-17"). Read them at noon UTC and
// format in UTC, so the viewer's own timezone can never move them to another day.
function calendarDate(date, options) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(
    new Date(`${date}T12:00:00Z`),
  )
}

/** The forecast starts on the location's today: "Today", "Tomorrow", then "Thu 19 Nov". */
export function dayLabel(date, index) {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  return calendarDate(date, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "Tuesday 17 November" */
export function longDate(date) {
  return calendarDate(date, { weekday: 'long', day: 'numeric', month: 'long' })
}
