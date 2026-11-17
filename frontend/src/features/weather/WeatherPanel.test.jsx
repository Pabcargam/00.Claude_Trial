import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  LOCATIONS,
  failWeather,
  fakeApi,
  restoreWeather,
  seedUser,
  signIn,
} from '../../test/fakeApi'
import { server } from '../../test/server'
import { renderApp } from '../../test/utils'

const [SEVILLE, SEVILLA, MADRID] = LOCATIONS
const savedKey = (user) => `todo-weather.location.${user.id}`

async function renderDashboard() {
  renderApp()
  await screen.findByRole('button', { name: 'Log out' })
  return screen.getByRole('region', { name: 'Weather' })
}

const searchBox = () => screen.getByRole('combobox', { name: 'Search a location' })
// Scoped to the suggestions: the priority <select>s have options too.
const suggestions = async () =>
  within(await screen.findByRole('listbox', { name: 'Locations' })).getAllByRole('option')
const dayRows = () =>
  within(screen.getByRole('list', { name: 'Daily forecast' })).getAllByRole('button')
const dayCard = () => screen.queryByRole('region', { name: /· Seville$/ })

async function pickSeville(user) {
  await user.type(searchBox(), 'sev')
  await user.click(await screen.findByRole('option', { name: 'Seville, Andalusia, Spain' }))
  await screen.findByRole('list', { name: 'Daily forecast' })
}

describe('weather panel', () => {
  let pablo

  beforeEach(() => {
    pablo = signIn()
  })

  it('invites to search and sends no weather request until a place is picked', async () => {
    const panel = await renderDashboard()

    expect(within(panel).getByText(/search a location to see today/i)).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Forecast range' })).not.toBeInTheDocument()
    expect(fakeApi.calls.forecast).toBe(0)
  })

  it('suggests places as you type and shows the forecast of the one you click', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    await user.type(searchBox(), 'sev')
    const options = await suggestions()
    expect(options.map((o) => o.textContent)).toEqual([
      'Seville, Andalusia, Spain',
      'Sevilla, Valle del Cauca, Colombia',
    ])
    expect(searchBox()).toHaveAttribute('aria-expanded', 'true')

    await user.click(options[0])

    expect(await screen.findByText('Seville, Andalusia, Spain')).toBeVisible()
    expect(searchBox()).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    // Today is the default range: one row, with rounded values and screen-reader labels.
    const [today] = await waitFor(() => dayRows())
    expect(dayRows()).toHaveLength(1)
    expect(today).toHaveTextContent('Today')
    expect(today).toHaveTextContent('Clear sky')
    expect(today).toHaveTextContent('20° / 10°')
    expect(today).toHaveTextContent('Rain chance 0%')
    expect(today).toHaveTextContent('Wind 10 km/h')
    expect(screen.getByRole('button', { name: 'Today', pressed: true })).toBeInTheDocument()
  })

  it('picks a suggestion with the keyboard and closes the list with Escape', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    await user.type(searchBox(), 'sev')
    await suggestions()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('option', { name: /Colombia/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(searchBox()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: /Colombia/ }).id,
    )
    await user.keyboard('{ArrowUp}{ArrowUp}') // wraps around: back to the last option
    expect(screen.getByRole('option', { name: /Colombia/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.keyboard('{ArrowDown}{Enter}')
    expect(await screen.findByText('Seville, Andalusia, Spain')).toBeVisible()
  })

  it('does not search for fewer than 2 characters and says when nothing matches', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    const searches = vi.fn()
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/weather/locations/')) searches()
    })
    await user.type(searchBox(), 's')
    // Past the 300 ms debounce. Inside act(): the debounced state update happens during the wait.
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)))
    expect(searches).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument()
    server.events.removeAllListeners()

    await user.clear(searchBox())
    await user.type(searchBox(), 'zzz')
    expect(await screen.findByText('No places found.')).toBeVisible()
    await user.keyboard('{ArrowDown}{Enter}') // nothing to pick: no-op
    expect(screen.getByText(/search a location to see today/i)).toBeVisible()
  })

  it('tells the user when the location search is unavailable', async () => {
    failWeather()
    const user = userEvent.setup()
    await renderDashboard()

    await user.type(searchBox(), 'sev')

    expect(await screen.findByText(/location search is unavailable/i)).toBeVisible()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('slices one 7-day forecast for Today, 3 days and 1 week', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await pickSeville(user)

    await user.click(screen.getByRole('button', { name: '3 days' }))
    expect(dayRows().map((row) => row.querySelector('strong').textContent)).toEqual([
      'Today',
      'Tomorrow',
      'Thu 12 Nov',
    ])

    await user.click(screen.getByRole('button', { name: '1 week' }))
    expect(dayRows()).toHaveLength(7)
    expect(dayRows()[6]).toHaveTextContent('Mon 16 Nov')
    expect(dayRows()[6]).toHaveTextContent('Rain chance – ·') // no probability: no "%"

    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(dayRows()).toHaveLength(1)
    expect(fakeApi.calls.forecast).toBe(1)
  })

  it('shows an error with Retry when the forecast fails', async () => {
    window.localStorage.setItem(savedKey(pablo), JSON.stringify(SEVILLE))
    failWeather()
    const user = userEvent.setup()
    await renderDashboard()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The weather service is unavailable right now.')

    restoreWeather()
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('list', { name: 'Daily forecast' })).toBeVisible()
  })

  it('remembers the picked place per user in this browser', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await pickSeville(user)

    expect(JSON.parse(window.localStorage.getItem(savedKey(pablo)))).toEqual({
      id: SEVILLE.id,
      name: 'Seville',
      admin1: 'Andalusia',
      country: 'Spain',
      latitude: SEVILLE.latitude,
      longitude: SEVILLE.longitude,
    })
    // Only the saved fields: no timezone or country code.
    expect(window.localStorage.getItem(savedKey(pablo))).not.toContain('timezone')
  })

  it('restores the saved place on load, and ignores another user or broken data', async () => {
    const other = seedUser({ email: 'other@example.com' })
    window.localStorage.setItem(savedKey(other), JSON.stringify(MADRID))
    window.localStorage.setItem(savedKey(pablo), JSON.stringify(SEVILLA))

    await renderDashboard()

    expect(await screen.findByText('Sevilla, Valle del Cauca, Colombia')).toBeVisible()
    expect(screen.queryByText(/Madrid/)).not.toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Daily forecast' })).toBeVisible()
  })

  it.each([['{not json'], [JSON.stringify({ name: 'No coordinates' })]])(
    'starts empty when the saved place is unreadable (%s)',
    async (stored) => {
      window.localStorage.setItem(savedKey(pablo), stored)
      await renderDashboard()

      expect(screen.getByText(/search a location to see today/i)).toBeVisible()
      expect(fakeApi.calls.forecast).toBe(0)
    },
  )

  it('keeps working when the browser blocks storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const user = userEvent.setup()
    await renderDashboard()

    await pickSeville(user)

    expect(screen.getByText('Seville, Andalusia, Spain')).toBeVisible()
  })

  describe('24-hour day card', () => {
    it('opens below the cards with 24 hourly tiles and closes with the same row or ×', async () => {
      const user = userEvent.setup()
      await renderDashboard()
      await pickSeville(user)
      await user.click(screen.getByRole('button', { name: '3 days' }))
      const calls = fakeApi.calls.forecast

      const tomorrow = dayRows()[1]
      await user.click(tomorrow)

      expect(tomorrow).toHaveAttribute('aria-pressed', 'true')
      const card = screen.getByRole('region', { name: 'Wednesday 11 November · Seville' })
      const tiles = within(card).getAllByRole('listitem')
      expect(tiles).toHaveLength(24)
      expect(tiles[0]).toHaveTextContent('00:00')
      expect(tiles[23]).toHaveTextContent('23:00')
      expect(tiles[23]).toHaveTextContent('Rain chance –')
      expect(tiles[23]).not.toHaveTextContent('–%')
      expect(tiles[13]).toHaveTextContent('15°') // 8 + 13 / 2 = 14.5 → 15
      expect(tiles[13]).toHaveTextContent('Rain chance 13%')
      expect(tiles[13]).toHaveTextContent('Wind 8 km/h')
      expect(within(tiles[2]).getByRole('img', { name: 'Overcast' })).toHaveTextContent('☁️')
      expect(fakeApi.calls.forecast).toBe(calls) // no extra request

      await user.click(tomorrow)
      expect(dayCard()).not.toBeInTheDocument()
      expect(tomorrow).toHaveAttribute('aria-pressed', 'false')

      await user.click(dayRows()[2])
      expect(screen.getByRole('region', { name: 'Thursday 12 November · Seville' })).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Close day details' }))
      expect(dayCard()).not.toBeInTheDocument()
    })

    it('shows the moon after sunset and the sun by day, keeping the real description', async () => {
      const user = userEvent.setup()
      await renderDashboard()
      await pickSeville(user)
      await user.click(dayRows()[0])

      const tiles = within(screen.getByRole('list', { name: 'Hourly forecast' })).getAllByRole(
        'listitem',
      )
      const icon = (tile) => within(tile).getByRole('img')
      // Night (is_day false): clear → moon, partly cloudy → cloud only.
      expect(icon(tiles[0])).toHaveTextContent('🌙')
      expect(icon(tiles[0])).toHaveAccessibleName('Clear sky')
      expect(icon(tiles[1])).toHaveTextContent('☁️')
      expect(icon(tiles[1])).toHaveAccessibleName('Partly cloudy')
      // Day: the sun icons.
      expect(icon(tiles[12])).toHaveTextContent('☀️')
      expect(icon(tiles[13])).toHaveTextContent('⛅')
    })

    it('shows day icons for hours without a day/night flag (older cached forecasts)', async () => {
      const user = userEvent.setup()
      await renderDashboard()
      await pickSeville(user)
      await user.click(screen.getByRole('button', { name: '1 week' }))
      await user.click(dayRows()[6])

      const card = screen.getByRole('region', { name: 'Monday 16 November · Seville' })
      const [midnight] = within(card).getAllByRole('listitem')
      expect(within(midnight).getByRole('img', { name: 'Clear sky' })).toHaveTextContent('☀️')
    })

    it('hides when the range no longer includes the day, and returns with it', async () => {
      const user = userEvent.setup()
      await renderDashboard()
      await pickSeville(user)
      await user.click(screen.getByRole('button', { name: '1 week' }))
      await user.click(dayRows()[5])
      expect(dayCard()).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '3 days' }))
      expect(dayCard()).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '1 week' }))
      expect(dayCard()).toBeInTheDocument()
    })

    it('closes when another place is picked', async () => {
      const user = userEvent.setup()
      await renderDashboard()
      await pickSeville(user)
      await user.click(dayRows()[0])
      expect(dayCard()).toBeInTheDocument()

      await user.type(searchBox(), 'mad')
      await user.click(await screen.findByRole('option', { name: 'Madrid, Spain' }))

      expect(await screen.findByText('Madrid, Spain')).toBeVisible()
      expect(dayCard()).not.toBeInTheDocument()
      expect(screen.queryByRole('region', { name: /· Madrid$/ })).not.toBeInTheDocument()
    })
  })
})
