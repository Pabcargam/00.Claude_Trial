import HealthBadge from './components/HealthBadge'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>TODO + Weather Planner</h1>
        <HealthBadge />
      </header>

      <main className={styles.grid}>
        <section className={styles.panel} aria-labelledby="tasks-heading">
          <h2 id="tasks-heading">Tasks</h2>
          <p>Your prioritised TODO list will live here.</p>
        </section>

        <section className={styles.panel} aria-labelledby="weather-heading">
          <h2 id="weather-heading">Weather</h2>
          <p>Search a location to see today, the next 3 days or the week ahead.</p>
        </section>
      </main>
    </div>
  )
}
