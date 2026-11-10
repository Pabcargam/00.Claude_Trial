import { displayName } from '../auth/displayName'
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
        {/* One bar: when it no longer fits beside the title it wraps as a whole,
            keeping the API status and the account on the same line. */}
        <div className={styles.statusBar}>
          <HealthBadge />
          <div className={styles.account}>
            <span className={styles.user}>
              Signed in as <strong>{displayName(user)}</strong>
            </span>
            <button type="button" className={styles.logout} onClick={logout}>
              Log out
            </button>
          </div>
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
