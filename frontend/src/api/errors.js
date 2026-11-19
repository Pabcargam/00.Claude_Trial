const FALLBACK = 'Something went wrong. Please try again.'

/**
 * Turn an Axios error into { message, fields } for forms.
 * DRF answers {"detail": "..."} for general errors and {"field": ["..."]} for validation.
 */
export function parseApiError(error) {
  const response = error?.response
  if (!response) return { message: 'Cannot reach the server. Check your connection.', fields: {} }
  if (response.status === 429) {
    return { message: 'Too many attempts. Wait a minute and try again.', fields: {} }
  }

  const data = response.data
  if (!data || typeof data !== 'object') return { message: FALLBACK, fields: {} }

  const fields = {}
  let message = typeof data.detail === 'string' ? data.detail : ''
  for (const [key, value] of Object.entries(data)) {
    if (key === 'detail') continue
    const text = Array.isArray(value) ? value.join(' ') : String(value)
    if (key === 'non_field_errors') message = text
    else fields[key] = text
  }
  if (!message && Object.keys(fields).length === 0) message = FALLBACK
  return { message, fields }
}
