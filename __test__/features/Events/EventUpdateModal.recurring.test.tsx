import * as CalendarDAO from '@common/features/Calendars/CalendarDAO'
import * as eventThunks from '@common/features/Calendars/CalendarSlice'
import * as EventDao from '@common/features/Events/EventDao'
import EventUpdateModal from '@common/features/Events/EventUpdateModal'
import { CalendarEvent } from '@common/types/EventsTypes'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/Renderwithproviders'

jest.mock('@common/features/Events/EventDao')
jest.mock('@common/features/Calendars/CalendarDAO')

describe("EventUpdateModal - Recurring Event 'Edit All' Handling", () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
    sessionStorage.clear()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  const baseUID = 'recurring-event-base'
  const calId = '667037022b752d0026472254/cal1'

  const preloadedState = {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        sid: 'test-sid',
        openpaasId: '667037022b752d0026472254'
      },
      organiserData: {
        cn: 'test',
        cal_address: 'test@test.com'
      }
    },
    calendars: {
      list: {
        [calId]: {
          id: calId,
          name: 'Test Calendar',
          color: '#FF0000',
          events: {},
          owner: { emails: ['test@test.com'] }
        }
      },
      pending: false
    }
  }

  describe('Master Event Display', () => {
    beforeAll(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
    })

    afterAll(() => {
      jest.useRealTimers()
    })
    it("should fetch and display master event when editing 'all events' of a recurring series", async () => {
      // Given a recurring series with modified instances
      const masterEvent = {
        uid: baseUID,
        title: 'Master Event Title',
        description: 'Master Description',
        calId,
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T11:00:00.000Z',
        repetition: { freq: 'daily', interval: 1 },
        allday: false,
        timezone: 'America/New_York',
        organizer: { cn: 'test', cal_address: 'test@test.com' },
        attendee: [{ cn: 'test', cal_address: 'test@test.com' }],
        URL: `/calendars/${calId}/${baseUID}.ics`
      } as CalendarEvent

      // Instance that was moved to different time
      const modifiedInstance = {
        ...masterEvent,
        uid: `${baseUID}/20250116`,
        title: 'Modified Instance Title', // Different title
        start: '2025-01-16T14:00:00.000Z', // Different time (2PM instead of 10AM)
        end: '2025-01-16T15:00:00.000Z'
      }

      const stateWithRecurringEvent = {
        ...preloadedState,
        calendars: {
          ...preloadedState.calendars,
          list: {
            [calId]: {
              ...preloadedState.calendars.list[calId],
              events: {
                [baseUID]: masterEvent,
                [`${baseUID}/20250116`]: modifiedInstance
              }
            }
          }
        }
      }

      // Mock fetchEvent to return raw ICS string for the master event
      const mockFetchEvent = jest
        .spyOn(EventDao, 'fetchEvent')
        .mockResolvedValue(
          [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Test//EN',
            'BEGIN:VEVENT',
            `UID:${baseUID}`,
            'SUMMARY:Master Event Title',
            'DESCRIPTION:Master Description',
            'DTSTART;TZID=America/New_York:20250115T100000',
            'DTEND;TZID=America/New_York:20250115T110000',
            'RRULE:FREQ=DAILY;INTERVAL=1',
            'END:VEVENT',
            'BEGIN:VTIMEZONE',
            'TZID:America/New_York',
            'BEGIN:STANDARD',
            'TZOFFSETFROM:-0400',
            'TZOFFSETTO:-0500',
            'TZNAME:EST',
            'DTSTART:19701101T020000',
            'END:STANDARD',
            'END:VTIMEZONE',
            'END:VCALENDAR'
          ].join('\r\n')
        )

      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId={calId}
          eventId={`${baseUID}/20250116`} // User clicked on modified instance
          typeOfAction="all"
        />,
        stateWithRecurringEvent
      )

      // Wait for master event to be fetched
      await waitFor(() => {
        expect(mockFetchEvent).toHaveBeenCalled()
      })

      // Should display master event data, NOT modified instance data
      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Master Event Title')
        expect(titleInput).toBeInTheDocument()
      })

      // Should NOT show modified instance title
      expect(
        screen.queryByDisplayValue('Modified Instance Title')
      ).not.toBeInTheDocument()

      // Expand more options to show timezone (normal mode shows summary first)
      fireEvent.click(
        screen.getByRole('button', { name: 'common.moreOptions' })
      )
      // Verify timezone dropdown shows master timezone
      await waitFor(() => {
        expect(screen.getByDisplayValue(/New York/i)).toBeDefined()
      })
    })

    it('should use master event directly if clicked event is already the master', async () => {
      const masterEvent = {
        uid: baseUID, // No recurrence-id
        title: 'Master Event',
        calId,
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T11:00:00.000Z',
        repetition: { freq: 'weekly', interval: 1 },
        allday: false,
        organizer: { cn: 'test', cal_address: 'test@test.com' },
        URL: `/calendars/${calId}/${baseUID}.ics`
      }

      const stateWithMaster = {
        ...preloadedState,
        calendars: {
          ...preloadedState.calendars,
          list: {
            [calId]: {
              ...preloadedState.calendars.list[calId],
              events: {
                [baseUID]: masterEvent
              }
            }
          }
        }
      }

      const mockFetchEvent = jest.spyOn(EventDao, 'fetchEvent')

      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId={calId}
          eventId={baseUID} // Already master event
          typeOfAction="all"
        />,
        stateWithMaster
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Master Event')).toBeInTheDocument()
      })

      // Should NOT fetch from API since we already have master
      expect(mockFetchEvent).not.toHaveBeenCalled()
    })

    it('should fallback to instance data if master event fetch fails', async () => {
      const instance = {
        uid: `${baseUID}/20250115`,
        title: 'Instance Event',
        calId,
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T11:00:00.000Z',
        repetition: { freq: 'daily', interval: 1 },
        allday: false,
        organizer: { cn: 'test', cal_address: 'test@test.com' },
        URL: `/calendars/${calId}/${baseUID}.ics`
      } as CalendarEvent

      const stateWithInstance = {
        ...preloadedState,
        calendars: {
          ...preloadedState.calendars,
          list: {
            [calId]: {
              ...preloadedState.calendars.list[calId],
              events: {
                [`${baseUID}/20250115`]: instance
              }
            }
          }
        }
      }

      // Mock fetchEvent to fail
      jest
        .spyOn(EventDao, 'fetchEvent')
        .mockRejectedValue(new Error('Network error'))

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId={calId}
          eventId={`${baseUID}/20250115`}
          typeOfAction="all"
        />,
        stateWithInstance
      )

      // Should still display the instance data as fallback
      await waitFor(() => {
        expect(screen.getByDisplayValue('Instance Event')).toBeInTheDocument()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch master event:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Update All Events - Using Base UID', () => {
    beforeAll(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
    })

    afterAll(() => {
      jest.useRealTimers()
    })
    it('should use base UID (not instance UID) when updating series with property changes', async () => {
      const masterEvent = {
        uid: baseUID,
        title: 'Weekly Meeting',
        description: 'Original description',
        calId,
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T11:00:00.000Z',
        repetition: { freq: 'weekly', interval: 1 },
        allday: false,
        organizer: { cn: 'test', cal_address: 'test@test.com' },
        URL: `/calendars/${calId}/${baseUID}.ics`
      } as CalendarEvent

      const instance1 = {
        ...masterEvent,
        uid: `${baseUID}/20250115`
      }

      const instance2 = {
        ...masterEvent,
        uid: `${baseUID}/20250122`,
        start: '2025-01-22T10:00:00.000Z',
        end: '2025-01-22T11:00:00.000Z'
      }

      const stateWithSeries = {
        ...preloadedState,
        calendars: {
          ...preloadedState.calendars,
          list: {
            [calId]: {
              ...preloadedState.calendars.list[calId],
              events: {
                [baseUID]: masterEvent,
                [`${baseUID}/20250115`]: instance1,
                [`${baseUID}/20250122`]: instance2
              }
            }
          }
        }
      }

      // Mock fetchEvent to return raw ICS for the master
      jest
        .spyOn(EventDao, 'fetchEvent')
        .mockResolvedValue(
          [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `UID:${baseUID}`,
            'SUMMARY:Weekly Meeting',
            'DESCRIPTION:Original description',
            'DTSTART:20250115T100000Z',
            'DTEND:20250115T110000Z',
            'RRULE:FREQ=WEEKLY;INTERVAL=1',
            'END:VEVENT',
            'END:VCALENDAR'
          ].join('\r\n')
        )
      const updateSeriesSpy = jest.spyOn(eventThunks, 'updateSeries')

      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId={calId}
          eventId={`${baseUID}/20250115`}
          typeOfAction="all"
        />,
        stateWithSeries
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Weekly Meeting')).toBeInTheDocument()
      })

      // Change only the title (property change, not recurrence rules)
      const titleInput = screen.getByDisplayValue('Weekly Meeting')
      fireEvent.change(titleInput, { target: { value: 'Updated Meeting' } })

      const saveButton = screen.getByRole('button', { name: 'actions.save' })

      await act(async () => {
        fireEvent.click(saveButton)
      })

      // Verify updateSeries was dispatched with base UID
      await waitFor(() => {
        expect(updateSeriesSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              uid: 'recurring-event-base',
              recurrenceId: undefined
            }),
            removeOverrides: false
          })
        )
      })
    })

    it('should use base UID when updating series with recurrence rule changes', async () => {
      const masterEvent = {
        uid: baseUID,
        title: 'Daily Standup',
        calId,
        start: '2025-01-15T09:00:00.000Z',
        end: '2025-01-15T09:30:00.000Z',
        repetition: { freq: 'daily', interval: 1 }, // Daily
        allday: false,
        timezone: 'America/New_York',
        organizer: { cn: 'test', cal_address: 'test@test.com' },
        attendee: [{ cn: 'test', cal_address: 'test@test.com' }],
        URL: `/calendars/${calId}/${baseUID}.ics`
      } as CalendarEvent

      const instance1 = {
        ...masterEvent,
        uid: `${baseUID}/20250115`
      }

      const instance2 = {
        ...masterEvent,
        uid: `${baseUID}/20250116`,
        start: '2025-01-16T09:00:00.000Z',
        end: '2025-01-16T09:30:00.000Z'
      }

      const stateWithSeries = {
        ...preloadedState,
        calendars: {
          ...preloadedState.calendars,
          list: {
            [calId]: {
              ...preloadedState.calendars.list[calId],
              events: {
                [baseUID]: masterEvent,
                [`${baseUID}/20250115`]: instance1,
                [`${baseUID}/20250116`]: instance2
              }
            }
          }
        }
      }

      jest
        .spyOn(EventDao, 'fetchEvent')
        .mockResolvedValue(
          [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `UID:${baseUID}`,
            'SUMMARY:Daily Standup',
            'DTSTART:20250115T090000Z',
            'DTEND:20250115T093000Z',
            'RRULE:FREQ=DAILY;INTERVAL=1',
            'END:VEVENT',
            'END:VCALENDAR'
          ].join('\r\n')
        )

      jest.spyOn(EventDao, 'fetchAllRecurrentVevents').mockResolvedValue([
        [
          'vevent',
          [
            ['uid', {}, 'text', baseUID],
            [
              'dtstart',
              { tzid: 'America/New_York' },
              'date-time',
              '2025-01-15T09:00:00Z'
            ],
            [
              'dtend',
              { tzid: 'America/New_York' },
              'date-time',
              '2025-01-15T09:30:00Z'
            ],
            ['summary', {}, 'text', 'Daily Standup'],
            ['sequence', {}, 'integer', 3],
            ['transp', {}, 'text', 'OPAQUE'],
            ['class', {}, 'text', 'PUBLIC'],
            ['rrule', {}, 'recur', { freq: 'DAILY', interval: 1 }],
            [
              'organizer',
              { cn: 'test' },
              'cal-address',
              'mailto:test@test.com'
            ],
            [
              'attendee',
              {
                partstat: 'ACCEPTED',
                rsvp: 'FALSE',
                role: 'CHAIR',
                cutype: 'INDIVIDUAL',
                cn: 'test'
              },
              'cal-address',
              'mailto:test@test.com'
            ],
            ['dtstamp', {}, 'date-time', '2025-01-15T08:00:00Z']
          ],
          []
        ],

        [
          'vevent',
          [
            ['uid', {}, 'text', baseUID],
            ['dtstart', {}, 'date-time', '2025-01-16T09:00:00Z'],
            ['dtend', {}, 'date-time', '2025-01-16T09:30:00Z'],
            ['summary', {}, 'text', 'Daily Standup'],
            ['sequence', {}, 'integer', 4],
            ['recurrence-id', {}, 'date-time', '2025-01-16T09:00:00Z'],
            ['transp', {}, 'text', 'OPAQUE'],
            ['class', {}, 'text', 'PUBLIC'],
            [
              'organizer',
              { cn: 'test' },
              'cal-address',
              'mailto:test@test.com'
            ],
            [
              'attendee',
              {
                partstat: 'ACCEPTED',
                rsvp: 'FALSE',
                role: 'CHAIR',
                cutype: 'INDIVIDUAL',
                cn: 'test'
              },
              'cal-address',
              'mailto:test@test.com'
            ],
            ['dtstamp', {}, 'date-time', '2025-01-15T08:00:00Z']
          ],
          []
        ]
      ])

      jest.spyOn(CalendarDAO, 'fetchCalendar').mockResolvedValue({
        _embedded: { 'dav:item': [] }
      } as any)

      const { store } = renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId={calId}
          eventId={`${baseUID}/20250115`}
          typeOfAction="all"
        />,
        stateWithSeries
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Daily Standup')).toBeInTheDocument()
      })

      // Click More Options to access repeat settings
      const moreOptionsButton = screen.getByText('common.moreOptions')
      fireEvent.click(moreOptionsButton)

      await waitFor(() => {
        const repeatCheckbox = screen.getByLabelText('event.form.repeat')
        expect(repeatCheckbox).toBeInTheDocument()
        expect(repeatCheckbox).toBeChecked()
      })

      // Change from daily to weekly
      const frequencySelect = screen.getByText('event.repeat.frequency.days')
      fireEvent.mouseDown(frequencySelect)
      const weeklyOption = screen.getByRole('option', {
        name: 'event.repeat.frequency.weeks'
      })
      fireEvent.click(weeklyOption)

      const saveButton = screen.getByRole('button', { name: 'actions.save' })

      await act(async () => {
        fireEvent.click(saveButton)
      })
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      // Verify all old instances were removed from store
      await waitFor(() => {
        const state = store.getState()
        const calendar = state.calendars.list[calId]

        expect(calendar.events[baseUID]).toBeUndefined()
        expect(calendar.events[`${baseUID}/20250115`]).toBeUndefined()
        expect(calendar.events[`${baseUID}/20250116`]).toBeUndefined()
      })
    })
  })

  describe('Master Event Date Preservation', () => {
    beforeAll(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
    })

    afterAll(() => {
      jest.useRealTimers()
    })
    it("should preserve master event date when updating time in 'all events' mode", async () => {
      // Master event starts on Jan 15 at 10:00 AM
      const masterEvent = {
        uid: baseUID,
        title: 'Daily Standup',
        calId,
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:30:00.000Z',
        repetition: { freq: 'daily', interval: 1 },
        allday: false,
        timezone: 'UTC',
        organizer: { cn: 'test', cal_address: 'test@test.com' },
        URL: `/calendars/${calId}/${baseUID}.ics`
      } as CalendarEvent

      // Instance on Jan 17 (different date)
      const instance = {
        ...masterEvent,
        uid: `${baseUID}/20250117`,
        start: '2025-01-17T10:00:00.000Z',
        end: '2025-01-17T10:30:00.000Z'
      }

      const stateWithSeries = {
        ...preloadedState,
        calendars: {
          ...preloadedState.calendars,
          list: {
            [calId]: {
              ...preloadedState.calendars.list[calId],
              events: {
                [baseUID]: masterEvent,
                [`${baseUID}/20250117`]: instance
              }
            }
          }
        }
      }

      jest
        .spyOn(EventDao, 'fetchEvent')
        .mockResolvedValue(
          [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `UID:${baseUID}`,
            'SUMMARY:Daily Standup',
            'DTSTART:20250115T100000Z',
            'DTEND:20250115T103000Z',
            'RRULE:FREQ=DAILY;INTERVAL=1',
            'END:VEVENT',
            'END:VCALENDAR'
          ].join('\r\n')
        )
      jest.spyOn(EventDao, 'putEvent').mockResolvedValue({ status: 201 } as any)

      const updateSeriesSpy = jest.spyOn(eventThunks, 'updateSeries')

      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId={calId}
          eventId={`${baseUID}/20250117`} // User clicked on Jan 17 instance
          typeOfAction="all"
        />,
        stateWithSeries
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Daily Standup')).toBeInTheDocument()
      })

      // Expand more options to show date/time inputs (normal mode shows DateTimeSummary first)
      fireEvent.click(
        screen.getByRole('button', { name: 'common.moreOptions' })
      )
      const input = await waitFor(() => screen.getByTestId('start-time-input'))
      // Change time to 2:00 PM (14:00)
      userEvent.click(input)
      userEvent.clear(input)
      userEvent.type(input, '14:00{enter}')

      const saveButton = screen.getByRole('button', { name: 'actions.save' })

      await act(async () => {
        fireEvent.click(saveButton)
      })
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      // Verify the API was called with master date (Jan 15) + new time (14:00)
      await waitFor(() => {
        expect(updateSeriesSpy).toHaveBeenCalled()
        const callArgs = updateSeriesSpy.mock.calls[0][0]
        const updatedEvent = callArgs.event

        // Should preserve Jan 15 date (master), not Jan 17 (clicked instance)
        expect(updatedEvent.start).toContain('2025-01-15')
        // But with new time 14:00 (in UTC, this is 14:00)
        expect(updatedEvent.start).toContain('14:00')
      })
    })
  })
})
