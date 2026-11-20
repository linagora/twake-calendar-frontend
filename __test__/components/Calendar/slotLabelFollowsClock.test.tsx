import CalendarLayout from '@private/components/Calendar/CalendarLayout'
import { waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

// The time the grid's minute clock reports, apart from the system time
const clock = vi.hoisted(() => ({ now: new Date('2026-11-20T10:30:00Z') }))

vi.mock('@common/components/Calendar/hooks/useCurrentMinute', () => ({
  useCurrentMinute: () => clock.now
}))

// #2169: with the calendar left open, the faded slot label stayed on the
// hour current when the page loaded instead of following the time
describe('Slot label next to the now indicator', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fades from the time of the minute clock, not from when the grid rendered', async () => {
    // The page loaded at 10:30 and the system time never moves from there:
    // only the minute clock says it is now 10:56
    vi.useFakeTimers({
      now: new Date('2026-11-20T10:30:00Z'),
      shouldAdvanceTime: true
    })
    clock.now = new Date('2026-11-20T10:56:00Z')

    renderWithProviders(<CalendarLayout />, {
      user: {
        userData: {
          sub: 'test',
          email: 'test@test.com',
          sid: 'testSid',
          openpaasId: 'user1'
        }
      },
      calendars: { list: {}, timeZone: 'UTC', pending: false }
    })

    const label = (time: string): Element | null =>
      document.querySelector(`.fc-timegrid-slot-label[data-time="${time}"]`)

    await waitFor(() => {
      expect(label('11:00:00')).toHaveClass('timegrid-slot-label-hidden')
    })
    expect(label('10:00:00')).not.toHaveClass('timegrid-slot-label-hidden')
  })
})
