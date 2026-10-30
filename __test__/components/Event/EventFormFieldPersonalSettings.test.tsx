import { EventFormFieldPersonalSettings } from '@common/components/Event/EventFormFieldPersonalSettings'
import { DEFAULT_FORM_VALUES } from '@common/components/Event/EventFormFields.types'
import { userAttendee } from '@common/features/User/models/attendee'
import { Valarms } from '@common/types/Valarms'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

describe('EventFormFieldPersonalSettings', () => {
  it('shows the event time in the user time zone, not the organizer one', () => {
    renderWithProviders(
      <EventFormFieldPersonalSettings
        v={{
          ...DEFAULT_FORM_VALUES,
          title: 'Elsewhere',
          start: '2099-01-15T09:00',
          end: '2099-01-15T10:00',
          timezone: 'Europe/Paris',
          alarms: Valarms.fromList([])
        }}
        typeOfAction="solo"
        setCalendarid={vi.fn()}
        userPersonalCalendars={[]}
        showMore={false}
        setAlarms={vi.fn()}
        setBusy={vi.fn()}
        setEventClass={vi.fn()}
        isOrganizer={false}
        user={{ cal_address: 'mailto:bob@example.com' } as userAttendee}
      />,
      { settings: { timeZone: 'Asia/Tokyo' } } as never
    )

    expect(screen.getByText(/17:00 – 18:00 UTC\+9/)).toBeInTheDocument()
  })
})
