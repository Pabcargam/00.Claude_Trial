import { http, HttpResponse } from 'msw'
import { getAccessToken, getRefreshToken, setTokens } from '../auth/tokenStore'
import { seedUser, signIn } from '../test/fakeApi'
import { server } from '../test/server'
import { logout, register, restoreSession } from './auth'

describe('auth api', () => {
  it.each([
    [
      'the server rejects the token',
      () => HttpResponse.json({ detail: 'blacklisted' }, { status: 400 }),
    ],
    ['the network is down', () => HttpResponse.error()],
  ])('logout clears the local session even when %s', async (_case, reply) => {
    signIn()
    setTokens({ access: 'still-here' })
    server.use(http.post('/api/v1/auth/logout/', reply))

    await logout()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('logout without a stored refresh token makes no request', async () => {
    const called = vi.fn()
    server.use(
      http.post('/api/v1/auth/logout/', () => {
        called()
        return new HttpResponse(null, { status: 205 })
      }),
    )

    await logout()

    expect(called).not.toHaveBeenCalled()
  })

  it('restoreSession returns null when nothing is stored', async () => {
    await expect(restoreSession()).resolves.toBeNull()
  })

  it('register sends empty names by default', async () => {
    let body
    server.use(
      http.post('/api/v1/auth/register/', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(seedUser({ email: body.email }), { status: 201 })
      }),
    )

    await register({ email: 'a@example.com', password: 'Sup3r-secret!' })

    expect(body).toEqual({
      email: 'a@example.com',
      password: 'Sup3r-secret!',
      first_name: '',
      last_name: '',
    })
  })
})
