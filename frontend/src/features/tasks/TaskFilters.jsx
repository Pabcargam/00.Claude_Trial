import { PRIORITIES } from './priority'
import styles from './Tasks.module.css'

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
]

/** filters: { status, priority, search }; onChange receives the full new filters object. */
export default function TaskFilters({ filters, onChange }) {
  const set = (field) => (value) => onChange({ ...filters, [field]: value })

  return (
    <div className={styles.filters}>
      <div role="group" aria-label="Filter by status" className={styles.segmented}>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-pressed={filters.status === s.value}
            onClick={() => set('status')(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <select
        className={styles.prioritySelect}
        aria-label="Filter by priority"
        value={filters.priority}
        onChange={(event) => set('priority')(event.target.value)}
      >
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <input
        type="search"
        className={styles.search}
        aria-label="Search tasks"
        placeholder="Search…"
        value={filters.search}
        onChange={(event) => set('search')(event.target.value)}
      />
    </div>
  )
}
