import { useState } from 'react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import TaskFilters from './TaskFilters'
import TaskForm from './TaskForm'
import TaskItem from './TaskItem'
import styles from './Tasks.module.css'
import { useTasks } from './useTasks'

const NO_FILTERS = { status: 'all', priority: '', search: '' }

export default function TasksPanel() {
  const [filters, setFilters] = useState(NO_FILTERS)
  const search = useDebouncedValue(filters.search)
  const tasks = useTasks({ ...filters, search })
  const filtered = filters.status !== 'all' || filters.priority || search.trim()

  return (
    <section className={styles.panel} aria-labelledby="tasks-heading">
      <h2 id="tasks-heading">
        Tasks
        {tasks.data ? (
          <>
            {' '}
            <span className={styles.count}>({tasks.data.length})</span>
          </>
        ) : null}
      </h2>
      <TaskForm />
      <TaskFilters filters={filters} onChange={setFilters} />

      {tasks.isPending && <p role="status">Loading tasks…</p>}

      {tasks.isError && (
        <div role="alert" className={styles.formError}>
          Couldn&apos;t load your tasks.{' '}
          <button type="button" onClick={() => tasks.refetch()}>
            Retry
          </button>
        </div>
      )}

      {tasks.data?.length === 0 && (
        <p className={styles.empty}>
          {filtered ? 'No tasks match these filters.' : 'No tasks yet. Add your first one above.'}
        </p>
      )}

      {tasks.data?.length > 0 && (
        <ul className={styles.list}>
          {tasks.data.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  )
}
