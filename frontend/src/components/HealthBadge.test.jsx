import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { renderWithClient } from '../test/utils'
import HealthBadge from './HealthBadge'

describe('HealthBadge', () => {
  it('shows a pending state while the request is in flight', () => {
    renderWithClient(<HealthBadge />)

    expect(screen.getByRole('status')).toHaveTextContent('Checking API…')
  })

  it('shows online when every dependency is ok', async () => {
    renderWithClient(<HealthBadge />)

    expect(await screen.findByText('API online')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('ok')
  })

  it('lists failing dependencies when the backend is degraded (503)', async () => {
    server.use(
      http.get('/api/v1/health/', () =>
        HttpResponse.json(
          { status: 'degraded', database: 'error', cache: 'error' },
          { status: 503 },
        ),
      ),
    )
    renderWithClient(<HealthBadge />)

    expect(await screen.findByText('API degraded (database, cache)')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('warn')
  })

  it('shows unreachable on a network error', async () => {
    server.use(http.get('/api/v1/health/', () => HttpResponse.error()))
    renderWithClient(<HealthBadge />)

    expect(await screen.findByText('API unreachable')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('error')
  })

  it('shows unreachable on an unexpected status', async () => {
    server.use(http.get('/api/v1/health/', () => new HttpResponse(null, { status: 500 })))
    renderWithClient(<HealthBadge />)

    expect(await screen.findByText('API unreachable')).toBeInTheDocument()
  })
})
