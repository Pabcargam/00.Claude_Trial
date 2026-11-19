import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../App'
import AuthProvider from '../auth/AuthProvider'

function testQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
}

/** Render with a fresh QueryClient per test so cached data never leaks between tests. */
export function renderWithClient(ui) {
  return render(<QueryClientProvider client={testQueryClient()}>{ui}</QueryClientProvider>)
}

/** The whole app (routes, auth, queries) at `route`, against the fake API from fakeApi.js. */
export function renderApp({ route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={testQueryClient()}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}
