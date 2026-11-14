import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import { AppProvider } from '../data/AppContext'
import { MockAuth } from '../data/auth'
import { LocalRepository } from '../data/localRepository'
import Log from './Log'

describe('Quick log', () => {
  beforeEach(() => localStorage.clear())

  it('saves with just a name and a rating', async () => {
    const auth = new MockAuth()
    const { devToken } = await auth.requestLink('t@t.co')
    const user = await auth.verifyLink('t@t.co', devToken!)
    const u = userEvent.setup()

    render(
      <AppProvider auth={auth}>
        <MemoryRouter><Log /></MemoryRouter>
      </AppProvider>,
    )

    const save = screen.getByRole('button', { name: 'Save visit' })
    expect(save).toBeDisabled()
    await u.type(screen.getByLabelText('Restaurant'), 'Test Diner')
    await u.click(screen.getByRole('radio', { name: /4 stars/ }))
    expect(save).toBeEnabled()
    await u.click(save)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Test Diner'))
    const list = await new LocalRepository(user.id).listRestaurants()
    expect(list).toHaveLength(1)
    expect(list[0].visits[0].rating).toBe(4)
  })
})
