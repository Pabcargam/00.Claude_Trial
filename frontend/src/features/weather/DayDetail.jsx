import { useEffect, useRef } from 'react'
import { Stat } from './ForecastList'
import { degrees, longDate, percent, weatherEmoji } from './format'
import { useForecast } from './useWeather'
import styles from './Weather.module.css'

/**
 * The 24-hour card of the day picked in the weather card, full width below both cards:
 * a tile grid on wide screens, a horizontal swipe strip on phones. Uses the forecast already
 * loaded by the weather card (same query), so opening a day sends no request.
 * Renders nothing when the day is outside the current range or the forecast isn't loaded.
 */
export default function DayDetail({ location, days, date, onClose }) {
  const forecast = useForecast(location)
  const ref = useRef(null)
  const day = forecast.data?.daily.slice(0, days).find((d) => d.date === date)

  // On desktop the card can open below a long task list: bring it into view.
  useEffect(() => {
    if (day) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }, [day])

  if (!day) return null
  const { units } = forecast.data
  const hours = forecast.data.hourly.filter((hour) => hour.time.startsWith(date))

  return (
    <section ref={ref} className={styles.detail} aria-labelledby="day-detail-heading">
      <div className={styles.detailHeader}>
        <h2 id="day-detail-heading">
          {longDate(date)} · {location.name}
        </h2>
        <button
          type="button"
          className={styles.close}
          aria-label="Close day details"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <ol className={styles.hours} aria-label="Hourly forecast">
        {hours.map((hour) => (
          <li key={hour.time} className={styles.hour}>
            <span className={styles.hourTime}>{hour.time.slice(11, 16)}</span>
            <span className={styles.emoji} role="img" aria-label={hour.description}>
              {weatherEmoji(hour.icon)}
            </span>
            <strong>{degrees(hour.temperature)}</strong>
            <span className={styles.muted}>
              <Stat emoji="💧" label="Rain chance">
                {percent(hour.precipitation_probability, units.probability)}
              </Stat>
            </span>
            <span className={styles.muted}>
              <Stat emoji="💨" label="Wind">
                {Math.round(hour.wind_speed)} {units.wind_speed}
              </Stat>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
