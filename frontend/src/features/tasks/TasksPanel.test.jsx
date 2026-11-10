import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { fakeApi, seedTask, seedUser, signIn } from '../../test/fakeApi'
import { server } from '../../test/server'
import { renderApp } from '../../test/utils'

function taskTitles() {
  return within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('span').textContent)
}

async function renderDashboard() {
  renderApp()
  await screen.findByRole('button', { name: 'Log out' })
}

describe('tasks panel', () => {
  let pablo

  beforeEach(() => {
    pablo = signIn()
  })

  it('lists only my tasks, in server order, with priority and details', async () => {
    seedTask(pablo, { title: 'Buy milk', priority: 'LOW' })
    seedTask(pablo, {
      title: 'Paint fence',
      priority: 'HIGH',
      is_outdoor: true,
      due_date: '2030-06-10',
    })
    seedTask(pablo, { title: 'Pay rent', priority: 'URGENT', is_completed: true })
    seedTask(seedUser({ email: 'other@example.com' }), { title: 'Not mine' })

    await renderDashboard()

    await waitFor(() => expect(taskTitles()).toEqual(['Paint fence', 'Buy milk', 'Pay rent']))
    expect(screen.getByRole('heading', { name: 'Tasks (3)' })).toBeInTheDocument()
    const fence = screen.getByText('Paint fence').closest('li')
    expect(within(fence).getByText('High')).toBeInTheDocument()
    expect(within(fence).getByText('Outdoor')).toBeInTheDocument()
    expect(within(fence).getByText(/^Due /)).toBeInTheDocument()
    expect(screen.queryByText('Not mine')).not.toBeInTheDocument()
  })

  it('shows an empty state for a new user', async () => {
    await renderDashboard()

    expect(await screen.findByText('No tasks yet. Add your first one above.')).toBeInTheDocument()
  })

  it('adds a task with priority, due date and outdoor flag, then resets the form', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    const title = screen.getByLabelText('New task')
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    await user.type(title, '  Mow the lawn  ')
    await user.selectOptions(screen.getByLabelText('Priority'), 'URGENT')
    await user.type(screen.getByLabelText('Due date'), '2030-05-01')
    await user.click(screen.getByLabelText('Outdoor'))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    const item = (await screen.findByText('Mow the lawn')).closest('li')
    expect(within(item).getByText('Urgent')).toBeInTheDocument()
    expect(within(item).getByText('Outdoor')).toBeInTheDocument()
    expect(fakeApi.tasks[0]).toMatchObject({ due_date: '2030-05-01', is_outdoor: true })
    expect(title).toHaveValue('')
    expect(screen.getByLabelText('Priority')).toHaveValue('MEDIUM')
  })

  it('shows API validation errors when adding fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/v1/tasks/', () =>
        HttpResponse.json(
          { title: ['Ensure this field has no more than 200 characters.'] },
          { status: 400 },
        ),
      ),
    )
    await renderDashboard()

    await user.type(screen.getByLabelText('New task'), 'Too long')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('no more than 200 characters')
  })

  it('crosses a task out and back', async () => {
    const user = userEvent.setup()
    seedTask(pablo, { title: 'Walk the dog' })
    await renderDashboard()

    await user.click(await screen.findByRole('checkbox', { name: 'Mark "Walk the dog" as done' }))

    const undo = await screen.findByRole('checkbox', { name: 'Mark "Walk the dog" as not done' })
    expect(undo).toBeChecked()
    expect(screen.getByText('Walk the dog').closest('li')).toHaveClass('done')

    await user.click(undo)

    expect(
      await screen.findByRole('checkbox', { name: 'Mark "Walk the dog" as done' }),
    ).not.toBeChecked()
  })

  it('edits the title and priority inline', async () => {
    const user = userEvent.setup()
    seedTask(pablo, { title: 'Call mum', priority: 'LOW' })
    await renderDashboard()

    await user.click(await screen.findByRole('button', { name: 'Edit "Call mum"' }))
    const title = screen.getByLabelText('Task title')
    expect(title).toHaveFocus()
    await user.clear(title)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.type(title, 'Call mum and dad')
    await user.selectOptions(screen.getByLabelText('Task priority'), 'HIGH')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const item = (await screen.findByText('Call mum and dad')).closest('li')
    expect(within(item).getByText('High')).toBeInTheDocument()
    expect(screen.queryByLabelText('Task title')).not.toBeInTheDocument()
  })

  it('cancels editing with Escape or the Cancel button without saving', async () => {
    const user = userEvent.setup()
    seedTask(pablo, { title: 'Call mum' })
    await renderDashboard()

    await user.click(await screen.findByRole('button', { name: 'Edit "Call mum"' }))
    await user.type(screen.getByLabelText('Task title'), ' later')
    await user.keyboard('{Escape}')
    expect(screen.getByText('Call mum')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit "Call mum"' }))
    expect(screen.getByLabelText('Task title')).toHaveValue('Call mum') // draft was reset
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(fakeApi.tasks[0].title).toBe('Call mum')
  })

  it('deletes a task only after confirmation', async () => {
    const user = userEvent.setup()
    seedTask(pablo, { title: 'Old chore' })
    const confirm = vi.spyOn(window, 'confirm')
    await renderDashboard()
    const deleteButton = await screen.findByRole('button', { name: 'Delete "Old chore"' })

    confirm.mockReturnValueOnce(false)
    await user.click(deleteButton)
    expect(screen.getByText('Old chore')).toBeInTheDocument()

    confirm.mockReturnValueOnce(true)
    await user.click(deleteButton)
    await waitFor(() => expect(screen.queryByText('Old chore')).not.toBeInTheDocument())
    expect(confirm).toHaveBeenLastCalledWith(`Delete "Old chore"? This can't be undone.`)
    expect(fakeApi.tasks).toHaveLength(0)
  })

  it('filters by status and priority', async () => {
    const user = userEvent.setup()
    seedTask(pablo, { title: 'Buy milk', priority: 'LOW' })
    seedTask(pablo, { title: 'Paint fence', priority: 'HIGH' })
    seedTask(pablo, { title: 'Pay rent', priority: 'HIGH', is_completed: true })
    await renderDashboard()
    await screen.findByText('Buy milk')

    await user.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(taskTitles()).toEqual(['Pay rent']))
    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(taskTitles()).toEqual(['Paint fence', 'Buy milk']))

    await user.selectOptions(screen.getByLabelText('Filter by priority'), 'HIGH')
    await waitFor(() => expect(taskTitles()).toEqual(['Paint fence']))

    await user.click(screen.getByRole('button', { name: 'All' }))
    await waitFor(() => expect(taskTitles()).toEqual(['Paint fence', 'Pay rent']))
  })

  it('searches as you type (debounced) and explains empty filtered results', async () => {
    const user = userEvent.setup()
    seedTask(pablo, { title: 'Paint fence' })
    seedTask(pablo, { title: 'Clean garage', description: 'paint cans too' })
    seedTask(pablo, { title: 'Buy milk' })
    await renderDashboard()
    await screen.findByText('Buy milk')

    await user.type(screen.getByLabelText('Search tasks'), 'paint')
    await waitFor(() => expect(taskTitles()).toEqual(['Clean garage', 'Paint fence']))

    await user.clear(screen.getByLabelText('Search tasks'))
    await user.type(screen.getByLabelText('Search tasks'), 'zzz')
    expect(await screen.findByText('No tasks match these filters.')).toBeInTheDocument()
  })

  it('shows an error with a working Retry when tasks fail to load', async () => {
    const user = userEvent.setup()
    seedTask(pablo, { title: 'Recovered task' })
    server.use(
      http.get('/api/v1/tasks/', () => HttpResponse.json({ detail: 'boom' }, { status: 500 }), {
        once: true,
      }),
    )
    await renderDashboard()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load your tasks.")
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Recovered task')).toBeInTheDocument()
  })
})
