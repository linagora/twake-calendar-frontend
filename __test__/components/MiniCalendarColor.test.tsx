import * as appHooks from '@common/app/hooks'
import { AppDispatch } from '@common/app/store'
import CalendarLayout from '@private/components/Calendar/CalendarLayout'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

describe('MiniCalendar', () => {
  const day = new Date()
  beforeEach(() => {
    vi.clearAllMocks()
    const dispatch = vi.fn().mockReturnValue(
      Object.assign(Promise.resolve({}), {
        unwrap: () => Promise.resolve({})
      })
    ) as unknown as AppDispatch
    vi.spyOn(appHooks, 'useAppDispatch').mockReturnValue(dispatch)
    vi.useFakeTimers().clearAllTimers()
  })

  const renderCalendar = () => {
    const preloadedState = {
      user: {
        userData: {
          sub: 'test',
          email: 'test@test.com',
          sid: 'mockSid',
          openpaasId: '667037022b752d0026472254'
        }
      },
      calendars: {
        list: {
          '667037022b752d0026472254/cal1': {
            name: 'Calendar 1',
            color: { light: '#FF0000', dark: '#000' },
            owner: { emails: ['test@test.com'] },
            events: {
              event1: {
                calId: '667037022b752d0026472254/cal1',
                id: 'event1',
                title: 'Test Event',
                start: day.toISOString()
              }
            }
          }
        },
        pending: false
      }
    }
    const mockCalendarRef = { current: null }
    renderWithProviders(<CalendarLayout />, preloadedState)
  }

  it('renders mini calendar with today in orange', async () => {
    renderCalendar()
    const today = new Date()
    const dateTestId = `date-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

    const todayTiles = screen.getAllByTestId(dateTestId)
    expect(todayTiles[0]).toHaveClass('today')
  })
})
