import { useEffect, useRef } from 'react'
import { useHorizontalPager } from '../../hooks/useHorizontalPager'
import { Stat } from './ForecastList'
import { degrees, longDate, percent, weatherEmoji } from './format'
import { useForecast } from './useWeather'
import styles from './Weather.module.css'

/**
 * The 24-hour card of the day picked in the weather card, full width below both cards: one
 * horizontal strip of hourly tiles (swipe, or ‹ › on wider screens). Uses the forecast already
 * loaded by the weather card (same query), so opening a day sends no request.
 * Renders nothing when the day is outside the current range or the forecast isn't loaded.
 */
export default function DayDetail({ location, days, date, onClose }) {
  const forecast = useForecast(location)
  const ref = useRef(null)
  const {
    ref: setHoursStrip,
    element: hoursStrip,
    canBack,
    canForward,
    page,
    refresh,
  } = useHorizontalPager()
  const day = forecast.data?.daily.slice(0, days).find((d) => d.date === date)
  const hours = forecast.data?.hourly.filter((hour) => hour.time.startsWith(date)) ?? []
  // The place's current hour: `current.time` is already in the location's local time.
  const nowHour = forecast.data?.current.time.slice(0, 13) // "2026-11-19T08"
  const nowIndex = hours.findIndex((hour) => hour.time.startsWith(nowHour)) // -1: not today

  // On desktop the card can open below a long task list: bring it into view.
  useEffect(() => {
    if (day) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }, [day])

  // Today starts at the current hour; other days at 00:00. Only when the day (or the hour)
  // changes, so it never fights the user's own scrolling.
  useEffect(() => {
    if (!hoursStrip) return
    const tile = nowIndex > 0 ? hoursStrip.children[nowIndex] : null
    hoursStrip.scrollTo?.({ left: tile ? tile.offsetLeft : 0 })
    // No scroll event is guaranteed for this jump: update ‹ › once it has been applied.
    const frame = requestAnimationFrame(refresh)
    return () => cancelAnimationFrame(frame)
  }, [hoursStrip, date, nowIndex, refresh])

  if (!day) return null
  const { units } = forecast.data

  return (
    <section ref={ref} className={styles.detail} aria-labelledby="day-detail-heading">
      <div className={styles.detailHeader}>
        <h2 id="day-detail-heading">
          {longDate(date)} · {location.name}
        </h2>
        <div className={styles.detailActions}>
          {/* Paging for mouse users; hidden on phones, where you swipe. */}
          <button
            type="button"
            className={`${styles.square} ${styles.pager}`}
            aria-label="Earlier hours"
            disabled={!canBack}
            onClick={() => page(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.square} ${styles.pager}`}
            aria-label="Later hours"
            disabled={!canForward}
            onClick={() => page(1)}
          >
            ›
          </button>
          <button
            type="button"
            className={styles.square}
            aria-label="Close day details"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>
      <ol ref={setHoursStrip} className={styles.hours} aria-label="Hourly forecast">
        {hours.map((hour, index) => (
          <li
            key={hour.time}
            className={index === nowIndex ? `${styles.hour} ${styles.hourNow}` : styles.hour}
          >
            <span className={styles.hourTime}>
              {index === nowIndex ? 'Now' : hour.time.slice(11, 16)}
            </span>
            <span className={styles.emoji} role="img" aria-label={hour.description}>
              {/* Only an explicit false is night: forecasts cached before is_day existed stay "day". */}
              {weatherEmoji(hour.icon, hour.is_day !== false)}
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
