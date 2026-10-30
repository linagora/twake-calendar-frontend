import { ResourceSearch } from '@common/components/Attendees/ResourceSearch'
import { PeopleSearch } from '@common/components/Attendees/PeopleSearch'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { CalendarSelectField } from '@common/components/Event/fields/CalendarSelectField'
import { NotificationField } from '@common/components/Event/fields/NotificationField'
import { VisibilityField } from '@common/components/Event/fields/VisibilityField'
import { Calendar } from '@common/types/CalendarTypes'
import { Valarms } from '@common/types/Valarms'
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../utils/Renderwithproviders'

vi.mock('@common/features/User/UserDao')

const calendar = {
  id: 'alice/alice',
  link: '/calendars/alice/alice.json',
  name: 'My calendar',
  owner: { firstname: 'alice', lastname: 'alice', emails: ['a@test.com'] },
  events: {}
} as unknown as Calendar

describe('visible field labels name their controls (#1786)', () => {
  it('names the participants input after its label and its hint', () => {
    renderWithProviders(
      <FieldWithLabel label="event.form.participants" isExpanded>
        <PeopleSearch selectedUsers={[]} onChange={vi.fn()} objectTypes={[]} />
      </FieldWithLabel>
    )

    expect(
      screen.getByRole('combobox', {
        name: 'event.form.participants peopleSearch.label'
      })
    ).toBeInTheDocument()
  })

  it('keeps the search name of a participants input without a label', () => {
    renderWithProviders(
      <PeopleSearch selectedUsers={[]} onChange={vi.fn()} objectTypes={[]} />
    )

    expect(
      screen.getByRole('combobox', { name: 'peopleSearch.label' })
    ).toBeInTheDocument()
  })

  it('names the resource input after its label and its placeholder', () => {
    renderWithProviders(
      <FieldWithLabel label="event.form.resource" isExpanded>
        <ResourceSearch
          objectTypes={['resource']}
          selectedResources={[]}
          onChange={vi.fn()}
          hideLabel
        />
      </FieldWithLabel>
    )

    expect(
      screen.getByRole('combobox', {
        name: 'event.form.resource resourceSearch.placeholder'
      })
    ).toBeInTheDocument()
  })

  it('names the notification and calendar selects after their labels', () => {
    renderWithProviders(
      <>
        <NotificationField
          alarms={new Valarms()}
          setAlarms={vi.fn()}
          showMore
        />
        <CalendarSelectField
          calendarid={calendar.id}
          setCalendarid={vi.fn()}
          userPersonalCalendars={[calendar]}
          showMore
        />
      </>
    )

    expect(
      screen.getByRole('combobox', { name: 'event.form.notification' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'event.form.calendar' })
    ).toBeInTheDocument()
  })

  it('names the visibility buttons group after its label', () => {
    renderWithProviders(
      <VisibilityField eventClass="PUBLIC" setEventClass={vi.fn()} showMore />
    )

    expect(
      screen.getByRole('group', { name: 'event.form.visibleTo' })
    ).toBeInTheDocument()
  })

  it('moves to the field when its label is clicked', () => {
    renderWithProviders(
      <FieldWithLabel label="event.form.participants" isExpanded>
        <PeopleSearch selectedUsers={[]} onChange={vi.fn()} objectTypes={[]} />
      </FieldWithLabel>
    )

    fireEvent.click(screen.getByText('event.form.participants'))

    expect(screen.getByRole('combobox')).toHaveFocus()
  })
})
