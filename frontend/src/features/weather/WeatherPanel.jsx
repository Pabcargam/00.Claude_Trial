import { placeLabel } from './format'
import LocationSearch from './LocationSearch'
import styles from './Weather.module.css'

/** The weather card: location search, then the forecast of the picked place. */
export default function WeatherPanel({ location, onSelectLocation }) {
  return (
    <section className={styles.panel} aria-labelledby="weather-heading">
      <h2 id="weather-heading">Weather</h2>
      <LocationSearch onSelect={onSelectLocation} />
      {location ? (
        <p className={styles.place}>{placeLabel(location)}</p>
      ) : (
        <p className={styles.hint}>
          Search a location to see today, the next 3 days or the week ahead.
        </p>
      )}
    </section>
  )
}
