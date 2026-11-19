import { dayLabel, degrees, percent, weatherEmoji } from './format'
import { rainLevel } from './rain'
import styles from './Weather.module.css'

const WARNING_CLASS = { possible: styles.warnPossible, likely: styles.warnLikely }

/**
 * One row per day: icon, day + description, max/min, rain chance and wind. Each row is a
 * toggle button that opens (or closes) that day's 24-hour card. A rainy day with open outdoor
 * tasks due (`outdoorByDate`: "YYYY-MM-DD" → count) gets a warning line.
 */
export default function ForecastList({
  days,
  units,
  selectedDate,
  onSelectDate,
  outdoorByDate = new Map(),
}) {
  return (
    <ul className={styles.days} aria-label="Daily forecast">
      {days.map((day, index) => {
        const level = rainLevel(day.precipitation_probability)
        const outdoor = level ? (outdoorByDate.get(day.date) ?? 0) : 0
        return (
          <li key={day.date}>
            <button
              type="button"
              className={styles.day}
              aria-pressed={day.date === selectedDate}
              onClick={() => onSelectDate(day.date === selectedDate ? null : day.date)}
            >
              <span className={styles.emoji} aria-hidden="true">
                {weatherEmoji(day.icon)}
              </span>
              <span className={styles.dayMain}>
                <strong>{dayLabel(day.date, index)}</strong>
                <span className={styles.muted}>{day.description}</span>
              </span>
              <span className={styles.dayStats}>
                <span>
                  <strong>{degrees(day.temperature_max)}</strong>{' '}
                  <span className={styles.muted}>/ {degrees(day.temperature_min)}</span>
                </span>
                <span className={styles.muted}>
                  <Stat emoji="💧" label="Rain chance">
                    {percent(day.precipitation_probability, units.probability)}
                  </Stat>
                  {' · '}
                  <Stat emoji="💨" label="Wind">
                    {Math.round(day.wind_speed_max)} {units.wind_speed}
                  </Stat>
                </span>
              </span>
              {outdoor > 0 && (
                <span className={`${styles.dayWarning} ${WARNING_CLASS[level]}`}>
                  <span aria-hidden="true">⚠ </span>
                  {outdoor} outdoor {outdoor === 1 ? 'task' : 'tasks'} due
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** "💧 40%" on screen, "Rain chance 40%" for screen readers. */
export function Stat({ emoji, label, children }) {
  return (
    <span>
      <span aria-hidden="true">{emoji} </span>
      <span className={styles.visuallyHidden}>{label} </span>
      {children}
    </span>
  )
}
