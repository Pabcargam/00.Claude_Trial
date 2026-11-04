import { screen } from '@testing-library/react'
import App from './App'
import { renderWithClient } from './test/utils'

describe('App', () => {
  it('renders the title, both panels and the API status', async () => {
    renderWithClient(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'TODO + Weather Planner' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Weather' })).toBeInTheDocument()
    expect(await screen.findByText('API online')).toBeInTheDocument()
  })
})
