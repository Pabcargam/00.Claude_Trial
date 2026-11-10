import { useState } from 'react'
import { parseApiError } from '../../api/errors'
import { DEFAULT_PRIORITY, PRIORITIES } from './priority'
import styles from './Tasks.module.css'
import { useCreateTask } from './useTasks'

const EMPTY = { title: '', priority: DEFAULT_PRIORITY, due_date: '', is_outdoor: false }

export default function TaskForm() {
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
    <form className={styles.addForm} onSubmit={handleSubmit} aria-label="Add a task">
      <input
        className={styles.grow}
        aria-label="New task"
        placeholder="What needs doing?"
        maxLength={200}
        value={task.title}
        onChange={set('title')}
      />
      <select aria-label="Priority" value={task.priority} onChange={set('priority')}>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <input type="date" aria-label="Due date" value={task.due_date} onChange={set('due_date')} />
      <label className={styles.checkLabel}>
        <input type="checkbox" checked={task.is_outdoor} onChange={set('is_outdoor')} />
        Outdoor
      </label>
      <button
        type="submit"
        className="primary"
        disabled={!task.title.trim() || createTask.isPending}
      >
        Add
      </button>
      {error && (
        <p role="alert" className={styles.formError}>
          {Object.values(error.fields).join(' ') || error.message}
        </p>
      )}
    </form>
  )
}
