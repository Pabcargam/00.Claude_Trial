import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { clearTokens } from '../auth/tokenStore'
import { resetFakeApi } from './fakeApi'
import { server } from './server'

// findBy*/waitFor give up after 1 s by default. Debounced searches (300 ms) plus a request can
// get close to that on a cold or loaded machine (coverage runs, CI), so allow up to 3 s.
// Passing tests are not slowed down: this is only the maximum wait.
configure({ asyncUtilTimeout: 3000 })

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
