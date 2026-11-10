import { useId } from 'react'
import styles from './FormField.module.css'

/** Labelled input with an accessible error message (announced via aria-describedby). */
export default function FormField({ label, error, ...inputProps }) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
