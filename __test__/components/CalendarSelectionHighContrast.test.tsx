import CalendarSelection from '../../apps/private/src/components/Calendar/CalendarSelection'
import { setHighContrastEnabled } from '@common/features/Settings/Accessibility/highContrastMode'
import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

jest.mock(
  '../../apps/private/src/features/booking/CreateAppointmentModal',
  () => ({ CreateAppointmentModal: () => null })
)
jest.mock('@common/features/booking/BookingDao', () => ({
  listBookingLinks: jest.fn().mockResolvedValue([])
}))
// a narrow layout: the calendar actions are reached with a long press
jest.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: () => ({ isTooSmall: true, isTablet: false })
}))

describe('CalendarSelection in a narrow layout', () => {
  beforeEach(() => localStorage.clear())

  const renderSelection = (): void => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={['user1/cal1']}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: {
          userData: {
            sub: 'test',
            email: 'test@test.com',
            sid: 'sid',
            openpaasId: 'user1'
          },
          tokens: { accessToken: 'token' }
        },
        calendars: {
          list: {
            'user1/cal1': {
              name: 'Calendar personal',
              id: 'user1/cal1',
              color: '#FF0000',
              owner: { emails: ['alice@example.com'], lastname: 'alice' }
            }
          },
          pending: false
        }
      }
    )
  }

  it('offers no actions button with the high contrast mode off', () => {
    renderSelection()
    expect(
      screen.queryByRole('button', { name: /a11y.moreActionsFor/ })
    ).not.toBeInTheDocument()
  })

  it('offers an actions button in high contrast mode', () => {
    act(() => setHighContrastEnabled(true))
    renderSelection()
    expect(
      screen.getByRole('button', { name: /a11y.moreActionsFor/ })
    ).toBeInTheDocument()
  })
})
