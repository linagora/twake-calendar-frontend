import moment from 'moment-timezone'
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
    dtstart?: string
    dtend?: string
    duration?: string
    isDateOnly?: boolean
    userPartstat?: string
    tzid?: string
  }): VCalComponent => {
    const type = params.isDateOnly ? 'date' : 'date-time'
    const tzParams = params.tzid ? { tzid: params.tzid } : {}
    const props: any[] = [
      ['uid', {}, 'text', 'recurring-event'],
      ['recurrence-id', tzParams, type, params.recurrenceId]
    ]

    if (params.dtstart) {
      props.push(['dtstart', tzParams, type, params.dtstart])
    }
    props.push(
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
    )

    if (params.dtend) {
      props.push(['dtend', tzParams, type, params.dtend])
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

    describe('DST transitions handling', () => {
      const nyTimezone = 'America/New_York'

      it.each([
        {
          transition: 'spring-forward',
          startDate: '2026-03-08',
          endDate: '2026-03-09',
          expectedHours: 23,
          testOffsetMs: 30 * 60 * 1000,
          expectedPast: true
        },
        {
          transition: 'fall-back',
          startDate: '2026-11-01',
          endDate: '2026-11-02',
          expectedHours: 25,
          testOffsetMs: -30 * 60 * 1000,
          expectedPast: false
        }
      ])(
        'calculates $expectedHours-hour calendar day for $transition all-day and DURATION:P1D exceptions',
        ({ startDate, endDate, expectedHours, testOffsetMs, expectedPast }) => {
          const expectedEnd = moment.tz(endDate, nyTimezone).valueOf()
          const startMs = moment.tz(startDate, nyTimezone).valueOf()
          expect(expectedEnd - startMs).toBe(expectedHours * 60 * 60 * 1000)

          const allDayException = createExceptionVevent({
            recurrenceId: startDate,
            dtstart: startDate,
            isDateOnly: true
          })
          expect(getVeventEndInstant(allDayException, nyTimezone)).toBe(
            expectedEnd
          )

          const durationDayException = createExceptionVevent({
            recurrenceId: startDate,
            dtstart: startDate,
            duration: 'P1D'
          })
          expect(getVeventEndInstant(durationDayException, nyTimezone)).toBe(
            expectedEnd
          )

          const ridFallbackException = createExceptionVevent({
            recurrenceId: startDate,
            isDateOnly: true
          })
          expect(getVeventEndInstant(ridFallbackException, nyTimezone)).toBe(
            expectedEnd
          )

          const testNow = expectedEnd + testOffsetMs
          expect(
            isPastRecurrenceException(allDayException, nyTimezone, testNow)
          ).toBe(expectedPast)
          expect(
            isPastRecurrenceException(durationDayException, nyTimezone, testNow)
          ).toBe(expectedPast)
          expect(
            isPastRecurrenceException(ridFallbackException, nyTimezone, testNow)
          ).toBe(expectedPast)
        }
      )

      it('handles P1W duration across DST transitions correctly (7 calendar days)', () => {
        const startDate = '2026-10-26'
        const expectedEndDate = '2026-11-02'
        const expectedEnd = moment.tz(expectedEndDate, nyTimezone).valueOf()
        const startMs = moment.tz(startDate, nyTimezone).valueOf()

        // Due to fall-back, 1 calendar week is 7 days + 1 hour = 169 hours instead of 168 hours
        expect(expectedEnd - startMs).toBe(169 * 60 * 60 * 1000)

        const durationWeekException = createExceptionVevent({
          recurrenceId: startDate,
          dtstart: startDate,
          duration: 'P1W'
        })
        expect(getVeventEndInstant(durationWeekException, nyTimezone)).toBe(
          expectedEnd
        )
      })

      it('preserves existing millisecond behavior for non-day durations', () => {
        const startMs = moment.tz('2026-03-08T10:00:00', nyTimezone).valueOf()
        const timedException = createExceptionVevent({
          recurrenceId: '2026-03-08T10:00:00',
          dtstart: '2026-03-08T10:00:00',
          duration: 'PT2H'
        })
        expect(getVeventEndInstant(timedException, nyTimezone)).toBe(
          startMs + 2 * 60 * 60 * 1000
        )

        const midnightMs = moment
          .tz('2026-03-08T00:00:00', nyTimezone)
          .valueOf()
        const pt24hException = createExceptionVevent({
          recurrenceId: '2026-03-08T00:00:00',
          dtstart: '2026-03-08T00:00:00',
          duration: 'PT24H'
        })
        expect(getVeventEndInstant(pt24hException, nyTimezone)).toBe(
          midnightMs + 24 * 60 * 60 * 1000
        )
      })
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

    it.each(['constructor', '__proto__'])(
      'answers a series with an override in the zone %s',
      tzid => {
        const override: VCalComponent = [
          'vevent',
          [
            ['uid', {}, 'text', 'recurring-event'],
            ['recurrence-id', {}, 'date-time', '2027-01-04T10:00:00Z'],
            ['dtend', { tzid }, 'date-time', '2027-01-04T12:00:00'],
            [
              'attendee',
              { partstat: 'NEEDS-ACTION' },
              'cal-address',
              'mailto:user@example.com'
            ]
          ],
          []
        ]

        const jcal = updateSeriesPartstatJCal(
          [createMasterVevent(), override],
          baseEvent,
          targetEmail,
          'ACCEPTED',
          fixedNow
        )

        const updatedOverride = (jcal[2] as VCalComponent[])[1]
        const targetAttendee = (updatedOverride[1] as any[]).find(
          p => p[0] === 'attendee'
        )
        expect(targetAttendee[1].partstat).toBe('ACCEPTED')
      }
    )
  })
})
