import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { AuthContext } from './AuthContext'
import { getRefreshToken, onSessionExpired } from './tokenStore'

const ANONYMOUS = { user: null, status: 'anonymous' }

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  // With a stored refresh token we don't know yet whether the user is logged in.
  const [session, setSession] = useState(() =>
    getRefreshToken() ? { user: null, status: 'loading' } : ANONYMOUS,
  )

  const endSession = useCallback(() => {
    queryClient.clear() // never show one user's cached tasks to the next
    setSession(ANONYMOUS)
  }, [queryClient])

  useEffect(() => {
    if (session.status !== 'loading') return undefined
    let active = true
    authApi.restoreSession().then((user) => {
      if (active) setSession(user ? { user, status: 'authenticated' } : ANONYMOUS)
    })
    return () => {
      active = false
    }
  }, [session.status])

  useEffect(() => onSessionExpired(endSession), [endSession])

  const login = useCallback(async (credentials) => {
    const user = await authApi.login(credentials)
    setSession({ user, status: 'authenticated' })
  }, [])

  const register = useCallback(
    async (details) => {
      await authApi.register(details)
      await login(details)
    },
    [login],
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    endSession()
  }, [endSession])

  const value = useMemo(
    () => ({ ...session, login, register, logout }),
    [session, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
