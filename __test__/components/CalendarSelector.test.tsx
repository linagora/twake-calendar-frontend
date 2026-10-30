import { CalendarSelector } from '@common/components/Calendar/CalendarSelector'
import { Calendar } from '@common/types/CalendarTypes'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

vi.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: (): { isTooSmall: boolean; isTablet: boolean } => ({
    isTooSmall: true,
    isTablet: false
  })
}))

describe('CalendarSelector on mobile', () => {
  const calendar: Calendar = {
    id: 'user1/cal1',
    link: '/calendars/user1/cal1.json',
    name: 'Office',
    owner: { firstname: 'alice', emails: ['alice@example.com'] },
    visibility: 'public',
    events: {}
  }

  const renderSelector = (setImportTarget = vi.fn()) =>
    renderWithProviders(
      <CalendarSelector
        userId="user1"
        importTarget="new"
        setImportTarget={setImportTarget}
      />,
      {
        user: {
          userData: {
            sub: 'test',
            email: 'alice@example.com',
            sid: 'mockSid',
            openpaasId: 'user1'
          }
        },
        calendars: { list: { [calendar.id]: calendar }, pending: false }
      }
    )

  it('renders the import destinations without crashing', () => {
    renderSelector()

    fireEvent.click(screen.getByRole('button', { name: /new_calendar/i }))

    expect(screen.getByRole('button', { name: /Office/ })).toBeInTheDocument()
  })

  it('selects the tapped calendar as import destination', () => {
    const setImportTarget = vi.fn()
    renderSelector(setImportTarget)

    fireEvent.click(screen.getByRole('button', { name: /new_calendar/i }))
    fireEvent.click(screen.getByRole('button', { name: /Office/ }))

    expect(setImportTarget).toHaveBeenCalledWith('user1/cal1')
  })
})
