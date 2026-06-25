import { RootState } from '@common/app/store'
import {
  createEventHandlers,
  EventHandlersProps
} from '@common/components/Calendar/handlers/eventHandlers'
import { EditModeDialog } from '@common/components/Event/EditModeDialog'
import EventPreviewModal from '@common/components/EventPreview'
import * as eventThunks from '@common/features/Calendars/CalendarSlice'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'
import * as EventDao from '@common/features/Events/EventDao'
import EventUpdateModal from '@common/features/Events/EventUpdateModal'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'
import { userAttendee } from '@common/features/User/models/attendee'

jest.mock('@common/components/Event/utils/eventUtils', () => {
  const actual = jest.requireActual('@common/components/Event/utils/eventUtils')
  return {
    ...actual,
    refreshCalendars: jest.fn(() => Promise.resolve()),
    refreshSingularCalendar: jest.fn(() => Promise.resolve())
  }
})
const mockOnClose = jest.fn()
const day = new Date('2025-03-15T10:00:00Z')

const basePreloadedState = {
  user: {
    userData: {
      sub: 'test',
      email: 'test@test.com',
      sid: 'aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro',
      openpaasId: '667037022b752d0026472254'
    },
    organiserData: {
      cn: 'test',
      cal_address: 'test@test.com'
    }
  },
  calendars: {
    list: {
      '667037022b752d0026472254/cal1': {
        id: '667037022b752d0026472254/cal1',
        name: 'Calendar',
        color: '#FF0000',
        events: {
          'recurring-base/20250315T100000': {
            uid: 'recurring-base/20250315T100000',
            title: 'Recurring Event Instance',
            calId: '667037022b752d0026472254/cal1',
            start: day.toISOString(),
            end: new Date('2025-03-15T11:00:00Z').toISOString(),
            organizer: { cn: 'test', cal_address: 'test@test.com' },
            recurrenceId: '20250315T100000',
            repetition: { freq: 'weekly', occurrences: 4, interval: 1 },
            timezone: 'UTC',
            URL: '/calendars/667037022b752d0026472254/cal1/recurring-base.ics',
            attendee: [
              new userAttendee({
                cn: 'test',
                cal_address: 'test@test.com',
                partstat: 'NEEDS-ACTION',
                rsvp: 'TRUE',
                role: 'REQ-PARTICIPANT',
                cutype: 'INDIVIDUAL'
              }),
              new userAttendee({
                cn: 'John',
                cal_address: 'john@test.com',
                partstat: 'NEEDS-ACTION',
                rsvp: 'TRUE',
                role: 'REQ-PARTICIPANT',
                cutype: 'INDIVIDUAL'
              })
            ]
          },
          'recurring-base/20250322T100000': {
            uid: 'recurring-base/20250322T100000',
            title: 'Recurring Event Instance',
            calId: '667037022b752d0026472254/cal1',
            start: new Date('2025-03-22T10:00:00Z').toISOString(),
            end: new Date('2025-03-22T11:00:00Z').toISOString(),
            organizer: { cn: 'test', cal_address: 'test@test.com' },
            recurrenceId: '20250322T100000',
            timezone: 'UTC',
            URL: '/calendars/667037022b752d0026472254/cal1/recurring-base.ics',
            attendee: [
              new userAttendee({
                cn: 'test',
                cal_address: 'test@test.com',
                partstat: 'NEEDS-ACTION',
                rsvp: 'TRUE',
                role: 'REQ-PARTICIPANT',
                cutype: 'INDIVIDUAL'
              })
            ]
          }
        },
        owner: { emails: ['test@test.com'] }
      }
    },
    pending: false,
    templist: {}
  }
} as unknown as RootState

// Master VEVENT fixture (no recurrence-id = master event)
const masterVeventFixture = [
  [
    'vevent',
    [
      ['uid', {}, 'text', 'recurring-base'],
      ['summary', {}, 'text', 'Recurring Event Instance'],
      ['dtstart', {}, 'date-time', '20250315T100000Z'],
      ['dtend', {}, 'date-time', '20250315T110000Z']
      // No recurrence-id — this marks it as the master
    ],
    []
  ]
] as any

describe('EditModeDialog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  const renderDialog = async (
    type: 'edit' | 'attendance' | 'delete',
    mockSetOpen = jest.fn(),
    mockEventAction = jest.fn()
  ) => {
    await act(async () =>
      renderWithProviders(
        <EditModeDialog
          type={type}
          setOpen={mockSetOpen}
          eventAction={mockEventAction}
        />,
        basePreloadedState
      )
    )
    return { mockSetOpen, mockEventAction }
  }

  it("renders dialog when type is 'edit'", async () => {
    await renderDialog('edit')

    expect(
      screen.getByText('editModeDialog.updateRecurrentEvent')
    ).toBeInTheDocument()
    expect(screen.getByText('editModeDialog.thisEvent')).toBeInTheDocument()
    expect(screen.getByText('editModeDialog.allEvents')).toBeInTheDocument()
  })

  it("renders dialog when type is 'attendance'", async () => {
    await renderDialog('attendance')

    expect(
      screen.getByText('editModeDialog.updateParticipationStatus')
    ).toBeInTheDocument()
  })

  it("calls eventAction with 'solo' when solo option is selected and Ok clicked", async () => {
    const mockSetOpen = jest.fn()
    const mockEventAction = jest.fn()

    await act(async () =>
      renderWithProviders(
        <EditModeDialog
          type="edit"
          setOpen={mockSetOpen}
          eventAction={mockEventAction}
        />,
        basePreloadedState
      )
    )
    await act(async () => {
      fireEvent.click(screen.getByLabelText('editModeDialog.thisEvent'))
      fireEvent.click(screen.getByRole('button', { name: 'common.ok' }))
    })

    await waitFor(() => {
      expect(mockEventAction).toHaveBeenCalledWith('solo')
      expect(mockSetOpen).toHaveBeenCalledWith(null)
    })
  })

  it("calls eventAction with 'all' when all option is selected and Ok clicked", async () => {
    const mockSetOpen = jest.fn()
    const mockEventAction = jest.fn()

    await act(async () =>
      renderWithProviders(
        <EditModeDialog
          type="edit"
          setOpen={mockSetOpen}
          eventAction={mockEventAction}
        />,
        basePreloadedState
      )
    )

    fireEvent.click(screen.getByLabelText('editModeDialog.allEvents'))
    fireEvent.click(screen.getByRole('button', { name: /Ok/i }))

    await waitFor(() => {
      expect(mockEventAction).toHaveBeenCalledWith('all')
      expect(mockSetOpen).toHaveBeenCalledWith(null)
    })
  })

  it('calls setOpen with null when Cancel is clicked', async () => {
    const mockSetOpen = jest.fn()
    const mockEventAction = jest.fn()

    await act(async () =>
      renderWithProviders(
        <EditModeDialog
          type="edit"
          setOpen={mockSetOpen}
          eventAction={mockEventAction}
        />,
        basePreloadedState
      )
    )

    fireEvent.click(screen.getByText('common.cancel'))

    await waitFor(() => {
      expect(mockSetOpen).toHaveBeenCalledWith(null)
      expect(mockEventAction).not.toHaveBeenCalled()
    })
  })
})

describe('EventPreviewModal - Recurring Event Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('shows EditModeDialog when editing a recurring event', async () => {
    jest.spyOn(eventThunks, 'getEvent').mockImplementation(payload => {
      return () =>
        Promise.resolve({
          calId: payload.calId,
          event:
            basePreloadedState.calendars.list['667037022b752d0026472254/cal1']
              .events['recurring-base/20250315T100000']
        }) as any
    })
    await act(async () =>
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        basePreloadedState
      )
    )

    fireEvent.click(screen.getByTestId('EditIcon'))

    await waitFor(() => {
      expect(
        screen.getByText('editModeDialog.updateRecurrentEvent')
      ).toBeInTheDocument()
    })
  })

  it('shows EditModeDialog when deleting a recurring event', async () => {
    await act(async () =>
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        basePreloadedState
      )
    )

    fireEvent.click(screen.getByLabelText('eventPreview.deleteEvent'))

    await waitFor(() => {
      expect(
        screen.getByText('editModeDialog.deleteRecurrentEvent')
      ).toBeInTheDocument()
    })
  })

  it('shows EditModeDialog when RSVP to a recurring event', async () => {
    await act(async () =>
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        basePreloadedState
      )
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'eventPreview.ACCEPTED' })
    )

    await waitFor(() => {
      expect(
        screen.getByText('editModeDialog.updateParticipationStatus')
      ).toBeInTheDocument()
    })
  })

  it('does not show EditModeDialog for non-recurring events', async () => {
    const nonRecurringState = {
      ...basePreloadedState,
      calendars: {
        ...basePreloadedState.calendars,
        list: {
          '667037022b752d0026472254/cal1': {
            ...basePreloadedState.calendars.list[
              '667037022b752d0026472254/cal1'
            ],
            events: {
              'single-event': {
                uid: 'single-event',
                title: 'Single Event',
                calId: '667037022b752d0026472254/cal1',
                start: day.toISOString(),
                end: new Date('2025-03-15T11:00:00Z').toISOString(),
                organizer: { cn: 'test', cal_address: 'test@test.com' },
                timezone: 'UTC',
                URL: '/calendars/667037022b752d0026472254/cal1/single-event.ics',
                attendee: []
              }
            }
          }
        }
      }
    }

    const spy = jest
      .spyOn(eventThunks, 'deleteEvent')
      .mockImplementation(payload => {
        return () => Promise.resolve(payload) as any
      })
    await act(async () =>
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="single-event"
        />,
        nonRecurringState
      )
    )

    fireEvent.click(screen.getByLabelText('eventPreview.deleteEvent'))

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })

    expect(
      screen.queryByText('editModeDialog.deleteRecurrentEvent')
    ).not.toBeInTheDocument()
  })
})

describe('Delete Recurring Event Instance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('calls deleteEventInstance when deleting single instance', async () => {
    const spy = jest
      .spyOn(eventThunks, 'deleteEventInstance')
      .mockImplementation(payload => {
        return () => Promise.resolve(payload) as any
      })

    await act(async () =>
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        basePreloadedState
      )
    )

    fireEvent.click(screen.getByLabelText('eventPreview.deleteEvent'))

    await waitFor(() => {
      expect(
        screen.getByText('editModeDialog.deleteRecurrentEvent')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('editModeDialog.thisEvent'))
    fireEvent.click(screen.getByRole('button', { name: /Ok/i }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })

    const receivedPayload = spy.mock.calls[0][0]
    expect(receivedPayload.event.uid).toBe('recurring-base/20250315T100000')
  })

  it('calls deleteEvent when deleting all instances', async () => {
    jest.spyOn(EventDao, 'fetchEvent').mockResolvedValue(`
    BEGIN:VCALENDAR
    VERSION:2.0
    BEGIN:VEVENT
    UID:recurring-base
    SUMMARY:Recurring Event Instance
    DTSTART:20250315T100000Z
    DTEND:20250315T110000Z
    END:VEVENT
    END:VCALENDAR
    `)

    const spy = jest
      .spyOn(eventThunks, 'deleteEvent')
      .mockImplementation(payload => {
        return () => Promise.resolve(payload) as any
      })

    await act(async () =>
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        basePreloadedState
      )
    )

    fireEvent.click(screen.getByLabelText('eventPreview.deleteEvent'))

    await waitFor(() => {
      expect(
        screen.getByText('editModeDialog.deleteRecurrentEvent')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('editModeDialog.allEvents'))
    fireEvent.click(screen.getByRole('button', { name: /Ok/i }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })

    const receivedPayload = spy.mock.calls[0][0]
    expect(receivedPayload.eventId).toBe('recurring-base/20250315T100000')
  })
})

describe('RSVP to Recurring Event', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('calls updateEventInstance when accepting single instance', async () => {
    jest
      .spyOn(EventDao, 'fetchEventJCal')
      .mockResolvedValue(['vcalendar', [], []] as any)
    const spy = jest
      .spyOn(eventThunks, 'updateEventInstance')
      .mockImplementation(payload => {
        const promise = Promise.resolve(payload)
        ;(promise as any).unwrap = () => promise
        return () => promise as any
      })

    await act(async () =>
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        basePreloadedState
      )
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'eventPreview.ACCEPTED' })
    )

    await waitFor(() => {
      expect(
        screen.getByText('editModeDialog.updateParticipationStatus')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('editModeDialog.thisEvent'))
    fireEvent.click(screen.getByRole('button', { name: /Ok/i }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })

    const updatedEvent = spy.mock.calls[0][0].event
    expect(updatedEvent.attendee[0].partstat).toBe('ACCEPTED')
  })

  it('calls updateSeriesPartstat when accepting all instances', async () => {
    jest.spyOn(EventDao, 'fetchAllRecurrentVevents').mockResolvedValue([
      [
        'vevent',
        [
          ['uid', {}, 'text', 'recurring-base'],
          ['summary', {}, 'text', 'Recurring Event Instance'],
          ['dtstart', {}, 'date-time', '20250315T100000Z'],
          ['dtend', {}, 'date-time', '20250315T110000Z'],
          ['recurrence-id', {}, 'date-time', '20250315T100000Z'],
          [
            'attendee',
            { cn: 'test', partstat: 'NEEDS-ACTION' },
            'cal-address',
            'mailto:test@test.com'
          ],
          [
            'attendee',
            { cn: 'John', partstat: 'NEEDS-ACTION' },
            'cal-address',
            'mailto:john@test.com'
          ]
        ],
        []
      ]
    ] as any)
    const spy = jest.spyOn(EventDao, 'putEvent').mockResolvedValue(undefined)

    await act(async () =>
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        basePreloadedState
      )
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'eventPreview.ACCEPTED' })
    )

    await waitFor(() => {
      expect(
        screen.getByText('editModeDialog.updateParticipationStatus')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('editModeDialog.allEvents'))
    fireEvent.click(screen.getByRole('button', { name: 'common.ok' }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })

    const callArgs = spy.mock.calls[0]

    expect(callArgs[1]).toStrictEqual([
      'vcalendar',
      VcalendarProperties,
      [
        [
          'vevent',
          [
            ['uid', {}, 'text', 'recurring-base'],
            ['summary', {}, 'text', 'Recurring Event Instance'],
            ['dtstart', {}, 'date-time', '20250315T100000Z'],
            ['dtend', {}, 'date-time', '20250315T110000Z'],
            ['recurrence-id', {}, 'date-time', '20250315T100000Z'],
            [
              'attendee',
              { cn: 'test', partstat: 'ACCEPTED' },
              'cal-address',
              'mailto:test@test.com'
            ],
            [
              'attendee',
              { cn: 'John', partstat: 'NEEDS-ACTION' },
              'cal-address',
              'mailto:john@test.com'
            ]
          ],
          []
        ],
        [
          'vtimezone',
          [['tzid', {}, 'text', 'UTC']],
          [
            [
              'standard',
              [
                ['tzoffsetfrom', {}, 'utc-offset', '+00:00'],
                ['tzoffsetto', {}, 'utc-offset', '+00:00'],
                ['tzname', {}, 'text', 'UTC'],
                ['dtstart', {}, 'date-time', '1970-01-01T00:00:00']
              ],
              []
            ]
          ]
        ]
      ]
    ])
  })
})

describe('Edit Recurring Event in Full Display', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('renders event with recurrenceId in URL', async () => {
    await act(async () =>
      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        basePreloadedState
      )
    )

    expect(
      screen.getByDisplayValue('Recurring Event Instance')
    ).toBeInTheDocument()
  })

  it("calls updateEventInstance when saving single instance with typeOfAction='solo'", async () => {
    jest
      .spyOn(EventDao, 'fetchEvent')
      .mockResolvedValue(
        [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'BEGIN:VEVENT',
          'UID:recurring-base',
          'SUMMARY:Recurring Event Instance',
          'DTSTART:20250315T100000Z',
          'DTEND:20250315T110000Z',
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n')
      )
    const spy = jest
      .spyOn(eventThunks, 'updateEventInstance')
      .mockImplementation(() => {
        return () => {
          const promise = Promise.resolve()
          ;(promise as any).unwrap = () => promise
          return promise as any
        }
      })

    await act(async () =>
      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
          typeOfAction="solo"
        />,
        basePreloadedState
      )
    )

    const titleField = screen.getByLabelText('event.form.title')
    fireEvent.change(titleField, {
      target: { value: 'Updated Single Instance' }
    })

    // Click Save
    fireEvent.click(screen.getByText('actions.save'))

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })

    const updatedEvent = spy.mock.calls[0][0].event
    expect(updatedEvent.title).toBe('Updated Single Instance')
    expect(updatedEvent.recurrenceId).toBe('20250315T100000')
  })

  it("calls updateSeries when saving all instances with typeOfAction='all'", async () => {
    const getEventSpy = jest.spyOn(EventDao, 'fetchEvent').mockResolvedValue(`
    BEGIN:VCALENDAR
    VERSION:2.0
    BEGIN:VEVENT
    UID:recurring-base
    RECURRENCE-ID:20250315T100000Z
    SUMMARY:Recurring Event Instance
    DTSTART:20250315T100000Z
    DTEND:20250315T110000Z
    END:VEVENT
    END:VCALENDAR
    `)

    const spy = jest
      .spyOn(eventThunks, 'updateSeries')
      .mockImplementation(() => {
        return () => {
          const promise = Promise.resolve()
          ;(promise as any).unwrap = () => promise
          return promise as any
        }
      })

    await act(async () =>
      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
          typeOfAction="all"
        />,
        basePreloadedState
      )
    )

    await waitFor(() => {
      expect(getEventSpy).toHaveBeenCalled()
    })

    const titleField = screen.getByDisplayValue('Recurring Event Instance')
    fireEvent.change(titleField, {
      target: { value: 'Updated All Instances' }
    })

    fireEvent.click(screen.getByRole('button', { name: 'actions.save' }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })

    const updatedEvent = spy.mock.calls[0][0].event
    expect(updatedEvent.title).toBe('Updated All Instances')
  })

  it("disables repetition editing when typeOfAction='solo'", async () => {
    await act(async () =>
      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
          typeOfAction="solo"
          eventData={
            basePreloadedState.calendars.list['667037022b752d0026472254/cal1']
              .events['recurring-base/20250315T100000']
          }
        />,
        basePreloadedState
      )
    )

    fireEvent.click(screen.getByRole('button', { name: 'common.moreOptions' }))
    expect(screen.getByText('event.repeat.every')).toBeInTheDocument()
    expect(screen.getByText('event.repeat.end.label')).toBeInTheDocument()

    const frequencySelect = screen.getByRole('radio', {
      name: /event.repeat.end.after \d event.repeat.end.occurrences/i
    })
    expect(frequencySelect).toBeDisabled()
  })

  it("fetches master event data when typeOfAction='all'", async () => {
    const getEventSpy = jest
      .spyOn(EventDao, 'fetchEvent')
      .mockResolvedValue(
        [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Test//EN',
          'BEGIN:VEVENT',
          'UID:recurring-base',
          'SUMMARY:Master Event Title',
          'DESCRIPTION:Master Description',
          'DTSTART:20250315T100000Z',
          'DTEND:20250315T110000Z',
          'RRULE:FREQ=WEEKLY;COUNT=4',
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n')
      )

    await act(async () =>
      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
          typeOfAction="all"
        />,
        basePreloadedState
      )
    )

    await waitFor(() => {
      expect(getEventSpy).toHaveBeenCalled()
      expect(screen.getByDisplayValue('Master Event Title')).toBeInTheDocument()
    })
  })
})

describe('Event Drag and Drop - Recurring Events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('shows EditModeDialog when dragging recurring event', async () => {
    const mockDispatch = jest.fn()
    const mockSetSelectedEvent = jest.fn()
    const mockSetOpenEditModePopup = jest.fn()
    const mockSetAfterChoiceFunc = jest.fn()

    const eventHandlers = createEventHandlers({
      setSelectedRange: jest.fn(),
      setOpenEventModal: jest.fn(),
      setTempEvent: jest.fn(),
      setOpenEventDisplay: jest.fn(),
      dispatch: mockDispatch,
      calendarRange: { start: new Date(), end: new Date() },
      setEventDisplayedId: jest.fn(),
      setEventDisplayedCalId: jest.fn(),
      setEventDisplayedTemp: jest.fn(),
      calendars: basePreloadedState.calendars.list,
      setSelectedEvent: mockSetSelectedEvent,
      setAfterChoiceFunc: mockSetAfterChoiceFunc,
      setOpenEditModePopup: mockSetOpenEditModePopup
    } as unknown as EventHandlersProps)

    const mockArg = {
      event: {
        extendedProps: {
          uid: 'recurring-base/20250315T100000',
          calId: '667037022b752d0026472254/cal1'
        }
      },
      delta: { years: 0, months: 0, days: 1, milliseconds: 0 }
    }

    eventHandlers.handleEventDrop(mockArg)

    await waitFor(() => {
      expect(mockSetSelectedEvent).toHaveBeenCalled()
      expect(mockSetOpenEditModePopup).toHaveBeenCalledWith('edit')
      expect(mockSetAfterChoiceFunc).toHaveBeenCalled()
    })
  })
})

describe('Event Resize - Recurring Events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('shows EditModeDialog when resizing recurring event', async () => {
    const mockDispatch = jest.fn()
    const mockSetSelectedEvent = jest.fn()
    const mockSetOpenEditModePopup = jest.fn()
    const mockSetAfterChoiceFunc = jest.fn()

    const eventHandlers = createEventHandlers({
      setSelectedRange: jest.fn(),
      setOpenEventModal: jest.fn(),
      setTempEvent: jest.fn(),
      setOpenEventDisplay: jest.fn(),
      dispatch: mockDispatch,
      calendarRange: { start: new Date(), end: new Date() },
      setEventDisplayedId: jest.fn(),
      setEventDisplayedCalId: jest.fn(),
      setEventDisplayedTemp: jest.fn(),
      calendars: basePreloadedState.calendars.list,
      setSelectedEvent: mockSetSelectedEvent,
      setAfterChoiceFunc: mockSetAfterChoiceFunc,
      setOpenEditModePopup: mockSetOpenEditModePopup
    } as unknown as EventHandlersProps)

    const mockArg = {
      event: {
        extendedProps: {
          uid: 'recurring-base/20250315T100000',
          calId: '667037022b752d0026472254/cal1'
        }
      },
      startDelta: { years: 0, months: 0, days: 0, milliseconds: 0 },
      endDelta: { years: 0, months: 0, days: 0, milliseconds: 3600000 } // 1 hour
    }

    eventHandlers.handleEventResize(mockArg)

    await waitFor(() => {
      expect(mockSetSelectedEvent).toHaveBeenCalled()
      expect(mockSetOpenEditModePopup).toHaveBeenCalledWith('edit')
      expect(mockSetAfterChoiceFunc).toHaveBeenCalled()
    })
  })
})

describe('RepeatEvent Component - Recurrence Editing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('disables repetition fields when isOwn is false', async () => {
    await act(async () =>
      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId="otherCal/cal"
          eventId="recurring-base/20250315T100000"
        />,
        {
          ...basePreloadedState,
          calendars: {
            ...basePreloadedState.calendars,
            list: {
              'otherCal/cal': {
                id: 'otherCal/cal',
                name: 'Other Calendar',
                color: '#00FF00',
                events: {
                  'recurring-base/20250315T100000': {
                    ...basePreloadedState.calendars.list[
                      '667037022b752d0026472254/cal1'
                    ].events['recurring-base/20250315T100000'],
                    calId: 'otherCal/cal',
                    organizer: { cn: 'other', cal_address: 'other@test.com' }
                  }
                }
              }
            }
          }
        }
      )
    )

    fireEvent.click(screen.getByRole('button', { name: 'common.moreOptions' }))

    // Repetition section should not be visible for non-owner
    expect(
      screen.queryByLabelText('event.form.repetition')
    ).not.toBeInTheDocument()
  })
})

describe('handleRSVP function', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('calls putEvent for non-recurring events', async () => {
    const mockDispatch = jest.fn()

    const {
      handleRSVP
    } = require('@common/components/Event/eventHandlers/eventHandlers')

    jest.spyOn(eventThunks, 'putEvent').mockImplementation(payload => {
      const promise = Promise.resolve(payload)
      ;(promise as any).unwrap = () => promise
      return () => promise as any
    })

    const nonRecurringEvent = {
      uid: 'single-event',
      title: 'Single Event',
      calId: '667037022b752d0026472254/cal1',
      start: day.toISOString(),
      end: new Date('2025-03-15T11:00:00Z').toISOString(),
      organizer: { cn: 'test', cal_address: 'test@test.com' },
      attendee: [
        new userAttendee({
          cn: 'test',
          cal_address: 'test@test.com',
          partstat: 'NEEDS-ACTION'
        })
      ]
    }

    await handleRSVP({
      dispatch: mockDispatch,
      calendar:
        basePreloadedState.calendars.list['667037022b752d0026472254/cal1'],
      user: basePreloadedState.user,
      event: nonRecurringEvent,
      rsvp: 'ACCEPTED'
    })

    expect(mockDispatch).toHaveBeenCalled()
  })
})

describe('handleDelete function', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('calls deleteEvent for non-recurring events', () => {
    const mockDispatch = jest.fn()
    const mockOnClose = jest.fn()

    const {
      handleDelete
    } = require('@common/components/Event/eventHandlers/eventHandlers')

    jest.spyOn(eventThunks, 'deleteEvent').mockImplementation(payload => {
      return () => Promise.resolve(payload) as any
    })

    const nonRecurringEvent = {
      uid: 'single-event',
      title: 'Single Event',
      calId: '667037022b752d0026472254/cal1',
      URL: '/calendars/667037022b752d0026472254/cal1/single-event.ics'
    }

    handleDelete(
      false, // isRecurring
      undefined,
      mockOnClose,
      mockDispatch,
      basePreloadedState.calendars.list['667037022b752d0026472254/cal1'],
      nonRecurringEvent,
      '667037022b752d0026472254/cal1',
      'single-event'
    )

    expect(mockOnClose).toHaveBeenCalledWith({}, 'backdropClick')
    expect(mockDispatch).toHaveBeenCalled()
  })

  it('calls deleteEventInstance when deleting solo recurring event', () => {
    const mockDispatch = jest.fn()
    const mockOnClose = jest.fn()

    const {
      handleDelete
    } = require('@common/components/Event/eventHandlers/eventHandlers')

    jest
      .spyOn(eventThunks, 'deleteEventInstance')
      .mockImplementation(payload => {
        return () => Promise.resolve(payload) as any
      })

    handleDelete(
      true, // isRecurring
      'solo',
      mockOnClose,
      mockDispatch,
      basePreloadedState.calendars.list['667037022b752d0026472254/cal1'],
      basePreloadedState.calendars.list['667037022b752d0026472254/cal1'].events[
        'recurring-base/20250315T100000'
      ],
      '667037022b752d0026472254/cal1',
      'recurring-base/20250315T100000'
    )

    expect(mockOnClose).toHaveBeenCalledWith({}, 'backdropClick')
    expect(mockDispatch).toHaveBeenCalled()
  })

  it('calls deleteEvent when deleting all recurring events', () => {
    const mockDispatch = jest.fn()
    const mockOnClose = jest.fn()

    const {
      handleDelete
    } = require('@common/components/Event/eventHandlers/eventHandlers')

    jest.spyOn(eventThunks, 'deleteEvent').mockImplementation(payload => {
      return () => Promise.resolve(payload) as any
    })

    handleDelete(
      true, // isRecurring
      'all',
      mockOnClose,
      mockDispatch,
      basePreloadedState.calendars.list['667037022b752d0026472254/cal1'],
      basePreloadedState.calendars.list['667037022b752d0026472254/cal1'].events[
        'recurring-base/20250315T100000'
      ],
      '667037022b752d0026472254/cal1',
      'recurring-base/20250315T100000'
    )

    expect(mockOnClose).toHaveBeenCalledWith({}, 'backdropClick')
    expect(mockDispatch).toHaveBeenCalled()
  })
})

describe('Calendar Integration - EditModeDialog Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })
  it('passes correct eventId when editing all instances from preview', async () => {
    await act(async () =>
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        basePreloadedState
      )
    )

    // Click edit
    fireEvent.click(screen.getByTestId('EditIcon'))

    await waitFor(() => {
      expect(
        screen.getByText('editModeDialog.updateRecurrentEvent')
      ).toBeInTheDocument()
    })

    // Select "All the events"
    fireEvent.click(screen.getByLabelText('editModeDialog.allEvents'))
    fireEvent.click(screen.getByRole('button', { name: /Ok/i }))

    await waitFor(() => {
      // Update modal should open
      expect(screen.getByText('event.updateEvent')).toBeInTheDocument()
    })
  })
})

describe('Event URL handling for recurring events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })
  it('uses base ID for event URL when moving recurring event', async () => {
    const moveEventSpy = jest
      .spyOn(eventThunks, 'moveEvent')
      .mockImplementation(payload => {
        const result = { calId: payload.cal.id, events: [] }
        const promise = Promise.resolve(result)
        ;(promise as any).unwrap = () => promise
        return () => promise as any
      })
    jest.spyOn(eventThunks, 'putEvent').mockImplementation(payload => {
      const result = { calId: payload.cal.id, events: [] }
      const promise = Promise.resolve(result)
      ;(promise as any).unwrap = () => promise
      return () => promise as any
    })
    jest
      .spyOn(EventDao, 'fetchAllRecurrentVevents')
      .mockResolvedValue(masterVeventFixture)

    const twoCalState = {
      user: {
        userData: {
          sub: 'test',
          email: 'test@test.com',
          sid: 'aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro',
          openpaasId: '667037022b752d0026472254'
        },
        organiserData: {
          cn: 'test',
          cal_address: 'test@test.com'
        }
      },
      calendars: {
        list: {
          '667037022b752d0026472254/cal1': {
            id: '667037022b752d0026472254/cal1',
            name: 'Calendar',
            color: '#FF0000',
            events: {
              'recurring-base/20250315T100000': {
                uid: 'recurring-base/20250315T100000',
                title: 'Recurring Event Instance',
                calId: '667037022b752d0026472254/cal1',
                start: day.toISOString(),
                end: new Date('2025-03-15T11:00:00Z').toISOString(),
                organizer: { cn: 'test', cal_address: 'test@test.com' },
                recurrenceId: '20250315T100000',
                repetition: { freq: 'weekly', occurrences: 4, interval: 1 },
                timezone: 'UTC',
                URL: '/calendars/667037022b752d0026472254/cal1/recurring-base.ics',
                attendee: [
                  new userAttendee({
                    cn: 'test',
                    cal_address: 'test@test.com',
                    partstat: 'NEEDS-ACTION',
                    rsvp: 'TRUE',
                    role: 'REQ-PARTICIPANT',
                    cutype: 'INDIVIDUAL'
                  }),
                  new userAttendee({
                    cn: 'John',
                    cal_address: 'john@test.com',
                    partstat: 'NEEDS-ACTION',
                    rsvp: 'TRUE',
                    role: 'REQ-PARTICIPANT',
                    cutype: 'INDIVIDUAL'
                  })
                ]
              },
              'recurring-base/20250322T100000': {
                uid: 'recurring-base/20250322T100000',
                title: 'Recurring Event Instance',
                calId: '667037022b752d0026472254/cal1',
                start: new Date('2025-03-22T10:00:00Z').toISOString(),
                end: new Date('2025-03-22T11:00:00Z').toISOString(),
                organizer: { cn: 'test', cal_address: 'test@test.com' },
                recurrenceId: '20250322T100000',
                timezone: 'UTC',
                URL: '/calendars/667037022b752d0026472254/cal1/recurring-base.ics',
                attendee: [
                  {
                    cn: 'test',
                    cal_address: 'test@test.com',
                    partstat: 'NEEDS-ACTION',
                    rsvp: 'TRUE',
                    role: 'REQ-PARTICIPANT',
                    cutype: 'INDIVIDUAL'
                  }
                ]
              }
            },
            owner: { emails: ['test@test.com'] }
          },
          '667037022b752d0026472254/cal2': {
            id: '667037022b752d0026472254/cal2',
            name: 'Calendar 2',
            color: '#00FF00',
            events: {}
          }
        },
        pending: false,
        templist: {}
      }
    }
    await act(async () =>
      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId="667037022b752d0026472254/cal1"
          eventId="recurring-base/20250315T100000"
        />,
        twoCalState
      )
    )

    // Expand to show calendar combobox (normal mode shows SectionPreviewRow)
    fireEvent.click(screen.getByRole('button', { name: 'common.moreOptions' }))
    fireEvent.mouseDown(screen.getByLabelText('event.form.calendar'))
    const option = await screen.findByText('Calendar 2')
    fireEvent.click(option)

    // Click Save button
    const saveButton = screen.getByRole('button', { name: 'actions.save' })

    await act(async () => {
      fireEvent.click(saveButton)
    })

    // Advance past the 500ms delay in the source code
    await act(async () => {
      jest.advanceTimersByTime(600)
    })

    await waitFor(() => {
      expect(moveEventSpy).toHaveBeenCalled()
    })

    const movePayload = moveEventSpy.mock.calls[0][0]
    // Should use base ID, not full uid with recurrence ID
    expect(movePayload.newURL).toContain('recurring-base.ics')
    expect(movePayload.newURL).not.toContain('/20250315T100000')
  })
})
