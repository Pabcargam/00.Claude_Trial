import { parseApiError } from './errors'

const httpError = (status, data) => ({ response: { status, data } })

describe('parseApiError', () => {
  it('explains network failures', () => {
    expect(parseApiError(new Error('Network Error'))).toEqual({
      message: 'Cannot reach the server. Check your connection.',
      fields: {},
    })
  })

  it('explains throttling', () => {
    expect(parseApiError(httpError(429, { detail: 'Request was throttled.' })).message).toMatch(
      /Too many attempts/,
    )
  })

  it('maps DRF field errors and keeps detail as the message', () => {
    const result = parseApiError(
      httpError(400, { email: ['Taken.', 'Really.'], password: ['Too short.'] }),
    )

    expect(result).toEqual({
      message: '',
      fields: { email: 'Taken. Really.', password: 'Too short.' },
    })
  })

  it('uses detail and non_field_errors as the general message', () => {
    expect(parseApiError(httpError(401, { detail: 'Bad credentials' })).message).toBe(
      'Bad credentials',
    )
    expect(parseApiError(httpError(400, { non_field_errors: ['Nope'] })).message).toBe('Nope')
  })

  it('falls back to a generic message for unexpected bodies', () => {
    expect(parseApiError(httpError(500, '<html>')).message).toMatch(/Something went wrong/)
    expect(parseApiError(httpError(500, {})).message).toMatch(/Something went wrong/)
  })
})
