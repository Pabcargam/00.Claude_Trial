import { renderHook } from '@testing-library/react'
import { useAuth } from './useAuth'

it('useAuth fails loudly outside <AuthProvider>', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}) // React logs the thrown error

  expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>')
})
