import ForecastFilters from './ForecastFilters'
import ForecastList from './ForecastList'
import { placeLabel } from './format'
import LocationSearch from './LocationSearch'
import { useForecast } from './useWeather'
import styles from './Weather.module.css'

/** The weather card: location search, then the forecast of the picked place. */
export default function WeatherPanel({ location, onSelectLocation, days, onChangeDays }) {
  const forecast = useForecast(location)

  return (
    <section className={styles.panel} aria-labelledby="weather-heading">
      <h2 id="weather-heading">Weather</h2>
      <LocationSearch onSelect={onSelectLocation} />
      {location ? (
        <>
          <div className={styles.toolbar}>
            <p className={styles.place}>{placeLabel(location)}</p>
            <ForecastFilters days={days} onChange={onChangeDays} />
          </div>
          <Forecast query={forecast} days={days} />
        </>
      ) : (
        <p className={styles.hint}>
          Search a location to see today, the next 3 days or the week ahead.
        </p>
      )}
    </section>
  )
}

function Forecast({ query, days }) {
  if (query.isPending) return <p role="status">Loading forecast…</p>
  if (query.isError) {
    return (
      <div role="alert" className={styles.error}>
        <p>The weather service is unavailable right now.</p>
        <button type="button" onClick={() => query.refetch()}>
          Retry
        </button>
      </div>
    )
  }
  // One 7-day response serves every range: the filters only slice it.
  return <ForecastList days={query.data.daily.slice(0, days)} units={query.data.units} />
}
