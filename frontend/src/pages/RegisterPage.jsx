import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { parseApiError } from '../api/errors'
import { useAuth } from '../auth/useAuth'
import FormField from '../components/FormField'
import styles from './AuthPage.module.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(parseApiError(err))
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1>Create your account</h1>
        {error?.message && (
          <p role="alert" className={styles.alert}>
            {error.message}
          </p>
        )}
        <FormField
          label="First name (optional)"
          autoComplete="given-name"
          value={form.firstName}
          onChange={update('firstName')}
          error={error?.fields.first_name}
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={update('email')}
          error={error?.fields.email}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update('password')}
          error={error?.fields.password}
        />
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className={styles.switch}>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </main>
  )
}
