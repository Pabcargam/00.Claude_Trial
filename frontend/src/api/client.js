import axios from 'axios'

/**
 * Shared HTTP client. All requests go to the same origin under /api/v1:
 * Vite proxies them to Django in development and Nginx does it in production,
 * so the browser never needs CORS for our own API.
 */
export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})
