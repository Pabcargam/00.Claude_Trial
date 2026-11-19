import { useId, useState } from 'react'
import { parseApiError } from '../../api/errors'
import { DEFAULT_PRIORITY, PRIORITIES } from './priority'
import styles from './Tasks.module.css'
import { useCreateTask } from './useTasks'

const EMPTY = { title: '', priority: DEFAULT_PRIORITY, due_date: '', is_outdoor: false }

/** "New task" card: creating tasks is kept apart from filtering them (see TasksPanel). */
export default function TaskForm() {
  const id = useId()
  const [task, setTask] = useState(EMPTY)
  const createTask = useCreateTask()
  const error = createTask.error ? parseApiError(createTask.error) : null

  const set = (field) => (event) => {
    const { type, checked, value } = event.target
    setTask({ ...task, [field]: type === 'checkbox' ? checked : value })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const payload = { ...task, title: task.title.trim(), due_date: task.due_date || null }
    createTask.mutate(payload, { onSuccess: () => setTask(EMPTY) })
  }

  return (
    <section className={styles.panel} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>New task</h2>
      <form className={styles.addForm} onSubmit={handleSubmit} aria-labelledby={`${id}-heading`}>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label htmlFor={`${id}-title`}>Title</label>
          <input
            id={`${id}-title`}
            placeholder="What needs doing?"
            maxLength={200}
            value={task.title}
            onChange={set('title')}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-priority`}>Priority</label>
          <select id={`${id}-priority`} value={task.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-due`}>Due date</label>
          <input id={`${id}-due`} type="date" value={task.due_date} onChange={set('due_date')} />
        </div>
        <div className={`${styles.formFooter} ${styles.fullWidth}`}>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={task.is_outdoor} onChange={set('is_outdoor')} />
            <span aria-hidden="true">🌤</span> Outdoor
          </label>
          <button
            type="submit"
            className="primary"
            disabled={!task.title.trim() || createTask.isPending}
          >
            Add task
          </button>
        </div>
        {error && (
          <p role="alert" className={styles.formError}>
            {Object.values(error.fields).join(' ') || error.message}
          </p>
        )}
      </form>
    </section>
  )
}
