import {
  updateSeriesPartstatJCal,
  getVeventEndInstant,
  isPastRecurrenceException
} from '@common/features/Events/transformers/updateSeriesPartstatJCal'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'

describe('updateSeriesPartstatJCal', () => {
  const baseEvent: CalendarEvent = {
    URL: '/calendars/cal-1/event-1.ics',
    calId: 'cal-1',
    uid: 'recurring-event',
    start: '2025-01-01T10:00:00.000Z',
    end: '2025-01-01T11:00:00.000Z',
    timezone: 'UTC',
    attendee: []
  }

  const targetEmail = 'user@example.com'
  const fixedNow = new Date('2026-09-04T12:00:00.000Z').getTime()

  const createMasterVevent = (): VCalComponent => [
    'vevent',
    [
      ['uid', {}, 'text', 'recurring-event'],
      ['dtstart', {}, 'date-time', '2024-01-01T10:00:00Z'],
      ['dtend', {}, 'date-time', '2024-01-01T11:00:00Z'],
      ['rrule', {}, 'recur', { freq: 'WEEKLY' }],
      [
        'attendee',
        { cn: 'User', partstat: 'NEEDS-ACTION' },
        'cal-address',
        'mailto:user@example.com'
      ],
      [
        'attendee',
        { cn: 'Other', partstat: 'NEEDS-ACTION' },
        'cal-address',
        'mailto:other@example.com'
      ]
    ],
    []
  ]

  const createExceptionVevent = (params: {
    recurrenceId: string
    dtstart: string
    dtend?: string
    duration?: string
    isDateOnly?: boolean
    userPartstat?: string
  }): VCalComponent => {
    const type = params.isDateOnly ? 'date' : 'date-time'
    const props: any[] = [
      ['uid', {}, 'text', 'recurring-event'],
      ['recurrence-id', {}, type, params.recurrenceId],
      ['dtstart', {}, type, params.dtstart],
      [
        'attendee',
        { cn: 'User', partstat: params.userPartstat ?? 'NEEDS-ACTION' },
        'cal-address',
        'mailto:user@example.com'
      ],
      [
        'attendee',
        { cn: 'Other', partstat: 'NEEDS-ACTION' },
        'cal-address',
        'mailto:other@example.com'
      ]
    ]

    if (params.dtend) {
      props.push(['dtend', {}, type, params.dtend])
    }
    if (params.duration) {
      props.push(['duration', {}, 'duration', params.duration])
    }

    return ['vevent', props, []] as unknown as VCalComponent
  }

  describe('getVeventEndInstant & isPastRecurrenceException', () => {
    it('determines past event from DTEND', () => {
      const pastVevent = createExceptionVevent({
        recurrenceId: '2025-01-01T10:00:00Z',
        dtstart: '2025-01-01T10:00:00Z',
        dtend: '2025-01-01T11:00:00Z'
      })
      const expectedEnd = new Date('2025-01-01T11:00:00Z').getTime()
      expect(getVeventEndInstant(pastVevent, 'UTC')).toBe(expectedEnd)
      expect(isPastRecurrenceException(pastVevent, 'UTC', fixedNow)).toBe(true)
    })

    it.each([
      {
        name: 'future event from DTEND',
        start: '2027-01-01T10:00:00Z',
        end: '2027-01-01T11:00:00Z'
      },
      {
        name: 'ongoing event as NOT past',
        start: '2026-09-04T11:30:00Z',
        end: '2026-09-04T12:30:00Z'
      }
    ])('determines $name', ({ start, end }) => {
      const vevent = createExceptionVevent({
        recurrenceId: start,
        dtstart: start,
        dtend: end
      })
      expect(isPastRecurrenceException(vevent, 'UTC', fixedNow)).toBe(false)
    })

    it('determines past event using DTSTART + duration when DTEND is missing', () => {
      const pastVevent = createExceptionVevent({
        recurrenceId: '2025-01-01T10:00:00Z',
        dtstart: '2025-01-01T10:00:00Z',
        duration: 'PT1H'
      })
      expect(isPastRecurrenceException(pastVevent, 'UTC', fixedNow)).toBe(true)
    })

    it('handles all-day exceptions in the past vs future', () => {
      const pastAllDay = createExceptionVevent({
        recurrenceId: '2026-09-02',
        dtstart: '2026-09-02',
        dtend: '2026-09-03',
        isDateOnly: true
      })
      const futureAllDay = createExceptionVevent({
        recurrenceId: '2026-09-05',
        dtstart: '2026-09-05',
        dtend: '2026-09-06',
        isDateOnly: true
      })
      expect(isPastRecurrenceException(pastAllDay, 'UTC', fixedNow)).toBe(true)
      expect(isPastRecurrenceException(futureAllDay, 'UTC', fixedNow)).toBe(
        false
      )
    })
  })

  describe('updateSeriesPartstatJCal series updates', () => {
    it('the exceptions in past should not apply the update of PARTSTAT', () => {
      const master = createMasterVevent()
      const pastException = createExceptionVevent({
        recurrenceId: '2025-01-01T10:00:00Z',
        dtstart: '2025-01-01T10:00:00Z',
        dtend: '2025-01-01T11:00:00Z',
        userPartstat: 'DECLINED'
      })

      const jcal = updateSeriesPartstatJCal(
        [master, pastException],
        baseEvent,
        targetEmail,
        'ACCEPTED',
        fixedNow
      )

      const updatedVevents = (jcal[2] as VCalComponent[]).filter(
        c => c[0] === 'vevent'
      )
      const pastTargetAttendee = (updatedVevents[1][1] as any[]).find(
        p => p[0] === 'attendee' && p[3] === 'mailto:user@example.com'
      )
      expect(pastTargetAttendee[1].partstat).toBe('DECLINED')
    })

    it('the exceptions in current and future should apply the update of PARTSTAT', () => {
      const master = createMasterVevent()

      const currentException = createExceptionVevent({
        recurrenceId: '2026-09-04T11:30:00Z',
        dtstart: '2026-09-04T11:30:00Z',
        dtend: '2026-09-04T12:30:00Z',
        userPartstat: 'NEEDS-ACTION'
      })

      const futureException = createExceptionVevent({
        recurrenceId: '2026-10-01T10:00:00Z',
        dtstart: '2026-10-01T10:00:00Z',
        dtend: '2026-10-01T11:00:00Z',
        userPartstat: 'NEEDS-ACTION'
      })

      const jcal = updateSeriesPartstatJCal(
        [master, currentException, futureException],
        baseEvent,
        targetEmail,
        'ACCEPTED',
        fixedNow
      )

      const updatedVevents = (jcal[2] as VCalComponent[]).filter(
        c => c[0] === 'vevent'
      )

      const currentTargetAttendee = (updatedVevents[1][1] as any[]).find(
        p => p[0] === 'attendee' && p[3] === 'mailto:user@example.com'
      )
      expect(currentTargetAttendee[1].partstat).toBe('ACCEPTED')

      const futureTargetAttendee = (updatedVevents[2][1] as any[]).find(
        p => p[0] === 'attendee' && p[3] === 'mailto:user@example.com'
      )
      expect(futureTargetAttendee[1].partstat).toBe('ACCEPTED')
    })
  })
})
