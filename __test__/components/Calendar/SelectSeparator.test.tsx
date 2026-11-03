import { CalendarSelectField } from '@common/components/Event/fields/CalendarSelectField'
import { SearchInFilter } from '@common/features/Search/SearchInFilter'
import { Calendar } from '@common/types/CalendarTypes'
import '@testing-library/jest-dom'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

const calendar = (id: string, name: string, delegated: boolean): Calendar =>
  ({
    id,
    link: `/calendars/${id}.json`,
    name,
    delegated,
    owner: { firstname: 'Alice', lastname: 'Doe', emails: ['alice@test.com'] },
    events: {}
  }) as unknown as Calendar

describe('Select separators (#1597)', () => {
  it('keeps the separator out of the options of the event Calendar field', () => {
    renderWithProviders(
      <CalendarSelectField
        calendarid="alice/personal"
        setCalendarid={vi.fn()}
        userPersonalCalendars={[
          calendar('alice/personal', 'Personal', false),
          calendar('bob/team', 'Team A', true)
        ]}
        showMore
      />
    )

    fireEvent.mouseDown(
      screen.getByRole('combobox', { name: 'event.form.calendar' })
    )

    const listbox = screen.getByRole('listbox')
    const options = within(listbox).getAllByRole('option')
    expect(options).toHaveLength(2)
    options.forEach(option => expect(option).not.toHaveTextContent(/^$/))
    expect(within(listbox).getByRole('separator')).toBeInTheDocument()
  })

  it('keeps the separators out of the options of the search "Search in" filter', () => {
    renderWithProviders(<SearchInFilter mode="popover" />)

    fireEvent.mouseDown(screen.getByRole('combobox'))

    const listbox = screen.getByRole('listbox')
    expect(
      within(listbox)
        .getAllByRole('option')
        .map(option => option.textContent)
    ).toEqual([
      'search.filter.allCalendar',
      'search.filter.myCalendar',
      'search.filter.sharedCalendars',
      'search.filter.teamCalendars'
    ])
    expect(within(listbox).getAllByRole('separator')).toHaveLength(3)
  })
})
