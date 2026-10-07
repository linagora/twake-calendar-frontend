import { EmbeddedCalendar } from '@private/components/Calendar/EmbeddedCalendar'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

jest.mock('@common/features/User/UserDao')

describe('EmbeddedCalendar', () => {
  it('shows the events of the team calendar', async () => {
    const start = new Date()
    start.setHours(10, 0, 0, 0)
    const end = new Date(start)
    end.setHours(11)
    renderWithProviders(<EmbeddedCalendar />, {
      router: {
        location: {
          pathname: '/embed/calendars/team1',
          search: '',
          hash: '',
          state: null,
          key: 'k'
        },
        action: 'POP'
      },
      user: {
        userData: { sub: 'test', email: 'test@test.com', openpaasId: 'user1' },
        tokens: { accessToken: 'token' }
      },
      calendars: {
        pending: false,
        list: {
          'team1/team1': {
            name: 'Team',
            id: 'team1/team1',
            delegated: true,
            color: { light: '#FF0000', dark: '#000' },
            owner: { firstname: 'Team', emails: [], teamCalendar: true },
            events: {
              event1: {
                id: 'event1',
                calId: 'team1/team1',
                uid: 'event1',
                title: 'Team meeting',
                start: start.toISOString(),
                end: end.toISOString()
              }
            }
          }
        }
      }
    })

    expect(await screen.findByText('Team meeting')).toBeInTheDocument()
  })
})
