import { CalendarSelectField } from '@common/components/Event/fields/CalendarSelectField'
import { useDefaultCalendarId } from '@common/features/Calendars/hooks/useDefaultCalendarId'
import { useAppSelector } from '@common/app/hooks'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

const personal = {
  name: 'Mine',
  id: 'user1/user1',
  color: { light: '#00FF00', dark: '#000' },
  owner: { firstname: 'Me', emails: ['me@test.com'] }
}
const team = {
  name: 'Team',
  id: 'team1/team1',
  delegated: true,
  access: { write: true },
  color: { light: '#FF0000', dark: '#000' },
  owner: { firstname: 'Team', emails: [], teamCalendar: true }
}

function NewEventCalendar(): JSX.Element {
  const calList = useAppSelector(state => state.calendars.list)
  const calendarid = useDefaultCalendarId({ calList, userId: 'user1' })
  return (
    <CalendarSelectField
      calendarid={calendarid}
      setCalendarid={() => {}}
      userPersonalCalendars={Object.values(calList)}
      showMore={false}
    />
  )
}

describe('the calendar of a new event in a space', () => {
  it('is the team calendar of the space, and cannot change', () => {
    renderWithProviders(<NewEventCalendar />, {
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
      user: { userData: { sub: 'test', openpaasId: 'user1' } },
      calendars: {
        pending: false,
        list: { 'user1/user1': personal, 'team1/team1': team }
      }
    })

    fireEvent.click(screen.getByText('Team'))

    expect(screen.queryByText('Mine')).toBe(null)
    expect(screen.queryByRole('combobox')).toBe(null)
  })
})
