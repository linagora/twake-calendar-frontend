import { CalendarSelectField } from '@common/components/Event/fields/CalendarSelectField'
import { Calendar } from '@common/types/CalendarTypes'
import '@testing-library/jest-dom'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../utils/Renderwithproviders'

const delegatedCalendar = (owner: Record<string, unknown>): Calendar =>
  ({
    id: 'room/room',
    link: '/calendars/room/room',
    name: 'Room A',
    delegated: true,
    owner: {
      firstname: 'alice',
      lastname: 'alice',
      emails: ['alice@test.com'],
      ...owner
    },
    events: {}
  }) as unknown as Calendar

const renderCollapsed = (calendar: Calendar): void => {
  renderWithProviders(
    <CalendarSelectField
      calendarid={calendar.id}
      setCalendarid={jest.fn()}
      userPersonalCalendars={[calendar]}
      showMore={false}
    />
  )
}

describe('CalendarSelectField collapsed owner caption (#1640)', () => {
  it('hides the owner caption of a resource calendar', () => {
    renderCollapsed(delegatedCalendar({ resource: true }))

    expect(screen.getByText('Room A')).toBeInTheDocument()
    expect(screen.queryByText('alice alice')).not.toBeInTheDocument()
  })

  it('shows the owner caption of a calendar delegated by another user', () => {
    renderCollapsed(delegatedCalendar({}))

    expect(screen.getByText('Room A')).toBeInTheDocument()
    expect(screen.getByText('alice alice')).toBeInTheDocument()
  })
})
