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

function draftFrom(task) {
  return {
    title: task.title,
    priority: task.priority,
    due_date: task.due_date ?? '',
    is_outdoor: task.is_outdoor,
  }
}

export default function TaskItem({ task }) {
  // 'view' | 'edit' | 'confirm-delete'. The delete confirmation is in-app on purpose:
  // native window.confirm() can be blocked or auto-dismissed by the browser.
  const [mode, setMode] = useState('view')
  const [draft, setDraft] = useState(() => draftFrom(task))
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const busy = updateTask.isPending || deleteTask.isPending

  const setField = (field) => (event) => {
    const { type, checked, value } = event.target
    setDraft({ ...draft, [field]: type === 'checkbox' ? checked : value })
  }

  function startEditing() {
    setDraft(draftFrom(task))
    setMode('edit')
  }

  function save(event) {
    event.preventDefault()
    const changes = { ...draft, title: draft.title.trim(), due_date: draft.due_date || null }
    updateTask.mutate({ id: task.id, changes }, { onSuccess: () => setMode('view') })
  }

  const cancelOnEscape = (event) => event.key === 'Escape' && setMode('view')

  if (mode === 'edit') {
    return (
      <li className={styles.item}>
        <form className={styles.editForm} onSubmit={save} onKeyDown={cancelOnEscape}>
          <input
            className={styles.grow}
            aria-label="Task title"
            maxLength={200}
            autoFocus
            value={draft.title}
            onChange={setField('title')}
          />
          <select aria-label="Task priority" value={draft.priority} onChange={setField('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Task due date"
            value={draft.due_date}
            onChange={setField('due_date')}
          />
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              aria-label="Task outdoor"
              checked={draft.is_outdoor}
              onChange={setField('is_outdoor')}
            />
            <span aria-hidden="true">🌤</span> Outdoor
          </label>
          <button type="submit" className="primary" disabled={!draft.title.trim() || busy}>
            Save
          </button>
          <button type="button" onClick={() => setMode('view')}>
            Cancel
          </button>
        </form>
      </li>
    )
  }

  const classes = [
    styles.item,
    task.is_completed && styles.done,
    task.is_outdoor && styles.outdoorItem,
  ]

  return (
    <li className={classes.filter(Boolean).join(' ')}>
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
      {task.is_outdoor && (
        <span className={styles.outdoorBadge}>
          <span aria-hidden="true">🌤</span> Outdoor
        </span>
      )}

      {mode === 'confirm-delete' ? (
        <span
          className={styles.actions}
          role="group"
          aria-label={`Confirm deleting "${task.title}"`}
        >
          <span className={styles.confirmText}>Delete this task?</span>
          <button
            type="button"
            className="danger"
            autoFocus
            disabled={busy}
            onKeyDown={cancelOnEscape}
            onClick={() => deleteTask.mutate(task.id)}
          >
            Yes, delete
          </button>
          <button type="button" onKeyDown={cancelOnEscape} onClick={() => setMode('view')}>
            Keep
          </button>
        </span>
      ) : (
        <span className={styles.actions}>
          <button type="button" aria-label={`Edit "${task.title}"`} onClick={startEditing}>
            Edit
          </button>
          <button
            type="button"
            className="danger"
            aria-label={`Delete "${task.title}"`}
            disabled={busy}
            onClick={() => setMode('confirm-delete')}
          >
            Delete
          </button>
        </span>
      )}
    </li>
  )
}
