import { useAuth } from '../auth/useAuth'
import HealthBadge from '../components/HealthBadge'
import TasksPanel from '../features/tasks/TasksPanel'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>TODO + Weather Planner</h1>
        <div className={styles.headerSide}>
          <HealthBadge />
          <span className={styles.user}>
            Signed in as <strong>{user.first_name || user.email}</strong>
          </span>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className={styles.grid}>
        <TasksPanel />

        <section className={styles.panel} aria-labelledby="weather-heading">
          <h2 id="weather-heading">Weather</h2>
          <p>
            Search a location to see today, the next 3 days or the week ahead. Coming in Phase 5.
          </p>
        </section>
      </main>
    </div>
  )
}
