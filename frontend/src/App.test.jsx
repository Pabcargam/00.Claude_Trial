import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getRefreshToken } from './auth/tokenStore'
import {
  expireAccessTokens,
  expireSession,
  fakeApi,
  seedTask,
  seedUser,
  signIn,
} from './test/fakeApi'
import { renderApp } from './test/utils'

async function fillLogin(user, email, password) {
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('authentication', () => {
  it('sends anonymous visitors to the login page', async () => {
    renderApp({ route: '/' })

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('logs in and shows the dashboard with the user and the API status', async () => {
    const user = userEvent.setup()
    seedUser({ email: 'pablo@example.com', firstName: 'Pablo' })
    renderApp({ route: '/login' })

    await fillLogin(user, 'Pablo@Example.com', 'Sup3r-secret!')

    expect(await screen.findByRole('heading', { name: 'TODO + Weather Planner' })).toBeVisible()
    expect(screen.getByText('Pablo')).toBeInTheDocument()
    expect(await screen.findByText('API online')).toBeInTheDocument()
    expect(getRefreshToken()).toMatch(/^refresh-/)
  })

  it('shows the API message on wrong credentials and stays on the login page', async () => {
    const user = userEvent.setup()
    seedUser({ email: 'pablo@example.com' })
    renderApp({ route: '/login' })

    await fillLogin(user, 'pablo@example.com', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No active account found with the given credentials',
    )
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled()
  })

  it('registers, logs in automatically and greets the user by first name', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/register' })

    await user.type(screen.getByLabelText('First name (optional)'), 'Ana')
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), 'An0ther-secret!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New task' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^Your tasks/ })).toBeInTheDocument()
  })

  it('shows field errors from the API when registration fails', async () => {
    const user = userEvent.setup()
    seedUser({ email: 'taken@example.com' })
    renderApp({ route: '/register' })

    await user.type(screen.getByLabelText('Email'), 'taken@example.com')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const email = screen.getByLabelText('Email')
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(email).toHaveAccessibleDescription('A user with this email already exists.')
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(/too short/)
  })

  it('links between the login and register pages', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/login' })

    await user.click(screen.getByRole('link', { name: 'Create one' }))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Log in' }))
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('logs out: back to login and the refresh token is revoked and forgotten', async () => {
    const user = userEvent.setup()
    signIn()
    const storedRefresh = getRefreshToken()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(getRefreshToken()).toBeNull()
    // The revoked token can't be used again.
    const reuse = await fetch('/api/v1/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh: storedRefresh }),
    })
    expect(reuse.status).toBe(401)
  })

  it('restores the session after a page reload from the stored refresh token', async () => {
    const pablo = signIn({ email: 'pablo@example.com' })
    seedTask(pablo, { title: 'Water the plants' })

    renderApp()

    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session…')
    expect(await screen.findByText('Water the plants')).toBeInTheDocument()
    // No first name: greet with the part of the email before the "@".
    expect(screen.getByText('pablo')).toBeInTheDocument()
  })

  it('treats an invalid stored refresh token as logged out', async () => {
    signIn()
    expireSession()

    renderApp()

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(getRefreshToken()).toBeNull()
  })

  it('sends logged-in users away from the login page', async () => {
    signIn()

    renderApp({ route: '/login' })

    expect(await screen.findByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('redirects unknown URLs home', async () => {
    renderApp({ route: '/does/not/exist' })

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('silently refreshes an expired access token and finishes the action', async () => {
    const user = userEvent.setup()
    signIn()
    renderApp()
    await screen.findByRole('button', { name: 'Log out' })
    expireAccessTokens()
    const refreshesBefore = fakeApi.calls.refresh

    await user.type(screen.getByLabelText('Title'), 'Buy paint')
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText('Buy paint')).toBeInTheDocument()
    expect(fakeApi.calls.refresh).toBe(refreshesBefore + 1)
  })

  it('returns to login when the session can no longer be refreshed', async () => {
    const user = userEvent.setup()
    signIn()
    renderApp()
    await screen.findByRole('button', { name: 'Log out' })
    expireSession()

    await user.type(screen.getByLabelText('Title'), 'Buy paint')
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })
})
