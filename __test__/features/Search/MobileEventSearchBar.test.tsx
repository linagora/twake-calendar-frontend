import type { Mock } from 'vitest'
import MobileSearchBar from '@common/components/Menubar/MobileEventSearchBar'
import { searchPeople } from '@common/features/User/UserDao'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@common/features/User/UserDao')

describe('MobileEventSearchBar', () => {
  const preloadedState = {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        sid: 'mockSid',
        openpaasId: 'user1'
      },
      tokens: { accessToken: 'token' }
    },
    calendars: {
      list: {
        'user1/cal1': {
          name: 'Calendar personal',
          id: 'user1/cal1',
          color: { light: '#FF0000', dark: '#000' },
          owner: { emails: ['test@test.com'] },
          events: {}
        }
      },
      pending: false
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(searchPeople as Mock).mockResolvedValue([])
  })

  it('empties the field when the Clear button is tapped', async () => {
    renderWithProviders(<MobileSearchBar />, preloadedState)
    const input = screen.getByPlaceholderText('common.search')

    userEvent.type(input, 'Orgfilter')
    expect(input).toHaveValue('Orgfilter')

    userEvent.click(screen.getByRole('button', { name: 'common.clear' }))

    await waitFor(() => expect(input).toHaveValue(''))
    expect(
      screen.queryByRole('button', { name: 'common.clear' })
    ).not.toBeInTheDocument()
  })

  it('does not append a new keyword to the cleared one', () => {
    renderWithProviders(<MobileSearchBar />, preloadedState)
    const input = screen.getByPlaceholderText('common.search')

    userEvent.type(input, 'Orgfilter')
    userEvent.click(screen.getByRole('button', { name: 'common.clear' }))
    userEvent.type(input, 'budget')

    expect(input).toHaveValue('budget')
  })
})
