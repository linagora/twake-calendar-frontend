import { CalendarEvent } from '@common/types/EventsTypes'
import {
  buildPrintPeriods,
  eventsInPeriod,
  printDayjs as dayjs,
  selectPrintEvents,
  toPrintEvent
} from '../index'

const makeEvent = (overrides: Partial<CalendarEvent>): CalendarEvent =>
  ({
    uid: 'uid-1',
    calId: 'cal-1',
    start: '2026-07-22T09:00:00Z',
    end: '2026-07-22T10:00:00Z',
    attendee: [],
    timezone: 'Etc/UTC',
    ...overrides
  }) as CalendarEvent

describe('toPrintEvent', () => {
  it('resolves a timed event into the requested timezone', () => {
    const printEvent = toPrintEvent(
      makeEvent({ title: 'Standup' }),
      'Europe/Paris',
      '(No title)'
    )

    expect(printEvent.allDay).toBe(false)
    expect(printEvent.title).toBe('Standup')
    // 09:00Z is 11:00 in Paris (summer, UTC+2).
    expect(printEvent.start.format('HH:mm')).toBe('11:00')
    expect(printEvent.end.format('HH:mm')).toBe('12:00')
  })

  it('falls back to the no-title label for blank titles', () => {
    const printEvent = toPrintEvent(
      makeEvent({ title: '   ' }),
      'Etc/UTC',
      '(No title)'
    )

    expect(printEvent.title).toBe('(No title)')
  })

  it('gives events without an end a default one-hour duration', () => {
    const printEvent = toPrintEvent(
      makeEvent({ end: undefined }),
      'Etc/UTC',
      '(No title)'
    )

    expect(printEvent.end.diff(printEvent.start, 'minute')).toBe(60)
  })

  it('keeps all-day events on their calendar date', () => {
    const printEvent = toPrintEvent(
      makeEvent({ allday: true, start: '2026-07-22', end: '2026-07-23' }),
      'Europe/Paris',
      '(No title)'
    )

    expect(printEvent.allDay).toBe(true)
    expect(printEvent.start.format('YYYY-MM-DD')).toBe('2026-07-22')
  })
})

describe('eventsInPeriod', () => {
  it('keeps only events overlapping the half-open period range', () => {
    const events = selectPrintEvents(
      [
        makeEvent({ uid: 'in', start: '2026-07-22T09:00:00Z' }),
        makeEvent({
          uid: 'out',
          start: '2026-08-01T09:00:00Z',
          end: '2026-08-01T10:00:00Z'
        })
      ],
      'Etc/UTC',
      '(No title)'
    )
    const [week] = buildPrintPeriods(
      'week',
      dayjs('2026-07-22'),
      dayjs('2026-07-22')
    )

    const inRange = eventsInPeriod(events, week)

    expect(inRange.map(e => e.uid)).toEqual(['in'])
  })
})
