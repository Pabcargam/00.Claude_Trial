import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LOCATIONS, seedTask, signIn } from '../../test/fakeApi'
import { renderApp } from '../../test/utils'

// Fake forecast rain chances (fakeApi.js): Thu 12 Nov 20%, Fri 13 30%, Sat 14 50%, Sun 15 60%.
const [SEVILLE] = LOCATIONS

const taskRow = (title) => screen.getByText(title).closest('li')
const rainTag = (title) => within(taskRow(title)).queryByText(/Rain likely|Possible rain/)
const dayRow = (label) =>
  within(screen.getByRole('list', { name: 'Daily forecast' }))
    .getAllByRole('button')
    .find((row) => row.querySelector('strong').textContent === label)

async function renderDashboard() {
  renderApp()
  await screen.findByRole('button', { name: 'Log out' })
}

describe('rain warnings for outdoor tasks', () => {
  let pablo

  beforeEach(() => {
    pablo = signIn()
  })

  it('needs a place in the weather panel', async () => {
    seedTask(pablo, { title: 'Paint the fence', is_outdoor: true, due_date: '2026-11-15' })
    await renderDashboard()

    await screen.findByText('Paint the fence')
    expect(rainTag('Paint the fence')).not.toBeInTheDocument()
  })

  describe('with a place picked', () => {
    beforeEach(() => {
      window.localStorage.setItem(`todo-weather.location.${pablo.id}`, JSON.stringify(SEVILLE))
    })

    it('tags only open outdoor tasks due on days with 30%+ rain', async () => {
      const outdoor = { is_outdoor: true }
      seedTask(pablo, { ...outdoor, title: 'Paint the fence', due_date: '2026-11-15' }) // 60%
      seedTask(pablo, { ...outdoor, title: 'Wash the car', due_date: '2026-11-13' }) // 30%
      seedTask(pablo, { ...outdoor, title: 'Mow the lawn', due_date: '2026-11-12' }) // 20%
      seedTask(pablo, { title: 'Tidy the garage', due_date: '2026-11-15' }) // indoor
      seedTask(pablo, {
        ...outdoor,
        title: 'Clean gutters',
        due_date: '2026-11-15',
        is_completed: true,
      })
      seedTask(pablo, { ...outdoor, title: 'Plant bulbs' }) // no due date
      seedTask(pablo, { ...outdoor, title: 'Fix the roof', due_date: '2026-12-01' }) // past the forecast
      await renderDashboard()

      const likely = await screen.findByText('Rain likely · 60%')
      expect(taskRow('Paint the fence')).toContainElement(likely)
      expect(likely).toHaveAttribute('title', 'Rain likely on the due date (60% chance)')
      expect(rainTag('Wash the car')).toHaveTextContent('Possible rain · 30%')
      for (const title of [
        'Mow the lawn',
        'Tidy the garage',
        'Clean gutters',
        'Plant bulbs',
        'Fix the roof',
      ]) {
        expect(rainTag(title)).not.toBeInTheDocument()
      }
    })

    it('counts open outdoor tasks on rainy forecast days', async () => {
      const user = userEvent.setup()
      const outdoor = { is_outdoor: true }
      seedTask(pablo, { ...outdoor, title: 'Paint the fence', due_date: '2026-11-15' })
      seedTask(pablo, { ...outdoor, title: 'Sweep the patio', due_date: '2026-11-15' })
      seedTask(pablo, { title: 'Tidy the garage', due_date: '2026-11-15' }) // indoor: not counted
      seedTask(pablo, {
        ...outdoor,
        title: 'Clean gutters',
        due_date: '2026-11-15',
        is_completed: true,
      })
      seedTask(pablo, { ...outdoor, title: 'Wash the car', due_date: '2026-11-13' })
      seedTask(pablo, { ...outdoor, title: 'Mow the lawn', due_date: '2026-11-12' }) // 20%: dry
      await renderDashboard()
      await screen.findByRole('list', { name: 'Daily forecast' })

      await user.click(screen.getByRole('button', { name: '1 week' }))

      expect(await within(dayRow('Sun 15 Nov')).findByText('2 outdoor tasks due')).toBeVisible()
      expect(dayRow('Fri 13 Nov')).toHaveTextContent('1 outdoor task due')
      expect(dayRow('Thu 12 Nov')).not.toHaveTextContent('outdoor task')
      expect(dayRow('Sat 14 Nov')).not.toHaveTextContent('outdoor task') // rainy, nothing due
    })

    it('updates the tag and the day count when a task is completed', async () => {
      const user = userEvent.setup()
      seedTask(pablo, { title: 'Paint the fence', is_outdoor: true, due_date: '2026-11-15' })
      await renderDashboard()
      await screen.findByText('Rain likely · 60%')
      await user.click(screen.getByRole('button', { name: '1 week' }))
      expect(await within(dayRow('Sun 15 Nov')).findByText('1 outdoor task due')).toBeVisible()

      await user.click(screen.getByRole('checkbox', { name: 'Mark "Paint the fence" as done' }))

      await within(taskRow('Paint the fence')).findByRole('checkbox', { checked: true })
      expect(rainTag('Paint the fence')).not.toBeInTheDocument()
      await waitFor(() => expect(dayRow('Sun 15 Nov')).not.toHaveTextContent('outdoor task'))
    })
  })
})
