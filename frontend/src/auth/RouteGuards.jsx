import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth'

function Restoring() {
  return (
    <p role="status" style={{ padding: '2rem', textAlign: 'center' }}>
      Restoring your session…
    </p>
  )
}

/** Pages for logged-in users. Anonymous visitors go to /login and come back afterwards. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Restoring />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

/** Login and register: pointless once logged in, so send the user home. */
export function GuestOnly() {
  const { status } = useAuth()

  if (status === 'loading') return <Restoring />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
