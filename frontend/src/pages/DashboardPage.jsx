import { displayName } from '../auth/displayName'
import { useAuth } from '../auth/useAuth'
import HealthBadge from '../components/HealthBadge'
import TasksPanel from '../features/tasks/TasksPanel'
import DayDetail from '../features/weather/DayDetail'
import { useWeatherSelection } from '../features/weather/useWeatherSelection'
import WeatherPanel from '../features/weather/WeatherPanel'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const weather = useWeatherSelection(user.id)

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
        <TasksPanel location={weather.location} />
        <WeatherPanel
          location={weather.location}
          onSelectLocation={weather.selectLocation}
          days={weather.days}
          onChangeDays={weather.setDays}
          selectedDate={weather.selectedDate}
          onSelectDate={weather.setSelectedDate}
        />
        {weather.selectedDate && (
          <DayDetail
            location={weather.location}
            days={weather.days}
            date={weather.selectedDate}
            onClose={() => weather.setSelectedDate(null)}
          />
        )}
      </main>
    </div>
  )
}
