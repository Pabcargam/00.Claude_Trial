import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { clearTokens } from '../auth/tokenStore'
import { resetFakeApi } from './fakeApi'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
  // No state may leak between tests: fake backend, stored refresh token, in-memory access token.
  resetFakeApi()
  clearTokens()
  window.localStorage.clear()
  vi.restoreAllMocks()
})
afterAll(() => server.close())
