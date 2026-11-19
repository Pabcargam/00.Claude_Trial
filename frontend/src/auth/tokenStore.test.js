import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  notifySessionExpired,
  onSessionExpired,
  setTokens,
} from './tokenStore'

describe('tokenStore', () => {
  it('keeps the access token in memory and the refresh token in localStorage', () => {
    setTokens({ access: 'a1', refresh: 'r1' })

    expect(getAccessToken()).toBe('a1')
    expect(getRefreshToken()).toBe('r1')
    expect(window.localStorage.getItem('todo-weather.refresh')).toBe('r1')
    expect(JSON.stringify(window.localStorage)).not.toContain('a1')
  })

  it('updates only the access token when no refresh token is given', () => {
    setTokens({ access: 'a1', refresh: 'r1' })

    setTokens({ access: 'a2' })

    expect(getAccessToken()).toBe('a2')
    expect(getRefreshToken()).toBe('r1')
  })

  it('clears both tokens', () => {
    setTokens({ access: 'a1', refresh: 'r1' })

    clearTokens()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('survives blocked storage (private mode) without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => setTokens({ access: 'a1', refresh: 'r1' })).not.toThrow()
    expect(getRefreshToken()).toBeNull()
    expect(getAccessToken()).toBe('a1')
  })

  it('notifies and unsubscribes session-expired listeners', () => {
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)

    notifySessionExpired()
    unsubscribe()
    notifySessionExpired()

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
