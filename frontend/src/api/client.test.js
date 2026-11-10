import { http, HttpResponse } from 'msw'
import { getAccessToken, getRefreshToken, onSessionExpired } from '../auth/tokenStore'
import { expireAccessTokens, expireSession, fakeApi, signIn } from '../test/fakeApi'
import { server } from '../test/server'
import { apiClient, refreshTokens } from './client'

describe('apiClient', () => {
  it('sends the access token as a Bearer header', async () => {
    signIn({ email: 'pablo@example.com' })
    await refreshTokens()

    const { data } = await apiClient.get('/auth/me/')

    expect(data.email).toBe('pablo@example.com')
  })

  it('refreshes once on 401 and retries the original request', async () => {
    signIn()
    await refreshTokens()
    expireAccessTokens()
    const before = fakeApi.calls.refresh

    const { status } = await apiClient.get('/tasks/')

    expect(status).toBe(200)
    expect(fakeApi.calls.refresh).toBe(before + 1)
  })

  it('shares one refresh between parallel 401s (rotation would revoke a second one)', async () => {
    signIn()
    await refreshTokens()
    expireAccessTokens()
    const before = fakeApi.calls.refresh

    const results = await Promise.all([
      apiClient.get('/tasks/'),
      apiClient.get('/auth/me/'),
      apiClient.get('/tasks/'),
    ])

    expect(results.map((r) => r.status)).toEqual([200, 200, 200])
    expect(fakeApi.calls.refresh).toBe(before + 1)
  })

  it('clears the session and notifies listeners when the refresh fails', async () => {
    signIn()
    await refreshTokens()
    expireSession()
    const expired = vi.fn()
    onSessionExpired(expired)

    await expect(apiClient.get('/tasks/')).rejects.toMatchObject({ response: { status: 401 } })

    expect(expired).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('does not try to refresh when a login attempt is rejected', async () => {
    signIn()
    const before = fakeApi.calls.refresh

    await expect(
      apiClient.post('/auth/token/', { email: 'x@example.com', password: 'nope' }),
    ).rejects.toMatchObject({ response: { status: 401 } })

    expect(fakeApi.calls.refresh).toBe(before)
  })

  it('does not retry the same request twice', async () => {
    signIn()
    server.use(
      http.get('/api/v1/tasks/', () => HttpResponse.json({ detail: 'nope' }, { status: 401 })),
    )

    await expect(apiClient.get('/tasks/')).rejects.toMatchObject({ response: { status: 401 } })

    expect(fakeApi.calls.refresh).toBe(1)
  })

  it('passes errors through untouched when there is no refresh token', async () => {
    await expect(apiClient.get('/tasks/')).rejects.toMatchObject({ response: { status: 401 } })
    expect(fakeApi.calls.refresh).toBe(0)
  })

  it('rejects refreshTokens() without a stored refresh token', async () => {
    await expect(refreshTokens()).rejects.toThrow('No refresh token')
  })
})
