import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

/** Render with a fresh QueryClient per test so cached data never leaks between tests. */
export function renderWithClient(ui) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}
