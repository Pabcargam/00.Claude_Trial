import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

/** Default happy-path handlers; tests override them with server.use(...). */
export const handlers = [
  http.get('/api/v1/health/', () =>
    HttpResponse.json({ status: 'ok', database: 'ok', cache: 'ok' }),
  ),
]

export const server = setupServer(...handlers)
