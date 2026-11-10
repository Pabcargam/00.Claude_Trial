import { createContext } from 'react'

/** { user, status: 'loading' | 'authenticated' | 'anonymous', login, register, logout } */
export const AuthContext = createContext(null)
