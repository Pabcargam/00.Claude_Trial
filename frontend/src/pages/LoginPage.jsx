import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { parseApiError } from '../api/errors'
import { useAuth } from '../auth/useAuth'
import FormField from '../components/FormField'
import styles from './AuthPage.module.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(form)
      navigate(location.state?.from?.pathname ?? '/', { replace: true })
    } catch (err) {
      setError(parseApiError(err))
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1>Log in</h1>
        {error?.message && (
          <p role="alert" className={styles.alert}>
            {error.message}
          </p>
        )}
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
          autoComplete="current-password"
          required
          value={form.password}
          onChange={update('password')}
          error={error?.fields.password}
        />
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
        <p className={styles.switch}>
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </form>
    </main>
  )
}
