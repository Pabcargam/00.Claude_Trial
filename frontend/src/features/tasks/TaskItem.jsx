import { useState } from 'react'
import { PRIORITIES, priorityLabel } from './priority'
import styles from './Tasks.module.css'
import { useDeleteTask, useUpdateTask } from './useTasks'

function formatDate(isoDate) {
  // Parse as a local calendar date (not UTC midnight) so the day never shifts.
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

export default function TaskItem({ task }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ title: task.title, priority: task.priority })
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const busy = updateTask.isPending || deleteTask.isPending

  function startEditing() {
    setDraft({ title: task.title, priority: task.priority })
    setEditing(true)
  }

  function save(event) {
    event.preventDefault()
    updateTask.mutate(
      { id: task.id, changes: { title: draft.title.trim(), priority: draft.priority } },
      { onSuccess: () => setEditing(false) },
    )
  }

  function remove() {
    if (window.confirm(`Delete "${task.title}"? This can't be undone.`)) deleteTask.mutate(task.id)
  }

  if (editing) {
    return (
      <li className={styles.item}>
        <form
          className={styles.editForm}
          onSubmit={save}
          onKeyDown={(event) => event.key === 'Escape' && setEditing(false)}
        >
          <input
            className={styles.grow}
            aria-label="Task title"
            maxLength={200}
            autoFocus
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <select
            aria-label="Task priority"
            value={draft.priority}
            onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button type="submit" className="primary" disabled={!draft.title.trim() || busy}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      </li>
    )
  }

  return (
    <li className={`${styles.item} ${task.is_completed ? styles.done : ''}`}>
      <input
        type="checkbox"
        aria-label={`Mark "${task.title}" as ${task.is_completed ? 'not done' : 'done'}`}
        checked={task.is_completed}
        disabled={busy}
        onChange={() =>
          updateTask.mutate({ id: task.id, changes: { is_completed: !task.is_completed } })
        }
      />
      <span className={styles.title}>{task.title}</span>
      <span className={`${styles.badge} ${styles[task.priority.toLowerCase()]}`}>
        {priorityLabel(task.priority)}
      </span>
      {task.due_date && <span className={styles.meta}>Due {formatDate(task.due_date)}</span>}
      {task.is_outdoor && <span className={styles.meta}>Outdoor</span>}
      <span className={styles.actions}>
        <button type="button" aria-label={`Edit "${task.title}"`} onClick={startEditing}>
          Edit
        </button>
        <button
          type="button"
          className="danger"
          aria-label={`Delete "${task.title}"`}
          disabled={busy}
          onClick={remove}
        >
          Delete
        </button>
      </span>
    </li>
  )
}
