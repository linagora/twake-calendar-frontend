import type { Mock } from 'vitest'
import { EmbeddedCalendar } from '@private/components/Calendar/EmbeddedCalendar'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

vi.mock('@common/features/User/UserDao')
vi.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: vi.fn(() => ({
    isTooSmall: false,
    isTablet: false
  }))
}))

describe('EmbeddedCalendar', () => {
  const renderEmbed = (): void => {
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
  }

  beforeEach(() => {
    ;(useScreenSizeDetection as Mock).mockReturnValue({
      isTooSmall: false,
      isTablet: false
    })
  })

  it('shows the events of the team calendar', async () => {
    renderEmbed()

    expect(await screen.findByText('Team meeting')).toBeInTheDocument()
  })

  it('offers the Create button of its toolbar on a desktop', async () => {
    renderEmbed()

    expect(await screen.findByText('Team meeting')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'event.createEvent' })
    ).toHaveLength(1)
    expect(screen.getByText('event.createEvent')).toBeInTheDocument()
  })

  it('leaves the Create button of its toolbar to the floating one on a phone', async () => {
    ;(useScreenSizeDetection as Mock).mockReturnValue({
      isTooSmall: true,
      isTablet: false
    })
    renderEmbed()

    expect(await screen.findByText('Team meeting')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'event.createEvent' })
    ).toHaveLength(1)
    expect(screen.queryByText('event.createEvent')).not.toBeInTheDocument()
  })

  it('fits the unavailable message under the Twake bar', () => {
    renderWithProviders(<EmbeddedCalendar />, {
      router: {
        location: {
          pathname: '/embed/calendars/doesnotexist',
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
      calendars: { pending: false, list: {} }
    })

    expect(
      screen.getByText('embed.calendarUnavailable').parentElement
    ).toHaveStyle({ height: 'calc(100vh - var(--twake-bar-height, 0px))' })
  })
})
