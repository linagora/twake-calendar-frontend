import { VObjectProperty } from '@common/features/Calendars/types/CalendarData'
import { parseCalendarEvent } from '@common/features/Events/utils'
import { Calendar } from '@common/types/CalendarTypes'

function parseWithDuration(
  dtstart: VObjectProperty,
  duration: string
): { start: string; end: string } {
  const data = [
    ['uid', {}, 'text', 'dur-dst-1'],
    dtstart,
    ['duration', {}, 'duration', duration]
  ] as VObjectProperty[]

  const event = parseCalendarEvent({
    data,
    color: {},
    calendar: { id: 'cal' } as Calendar,
    eventURL: '/calendars/cal/dur-dst-1.ics'
  })
  return {
    start: new Date(event.start).toISOString(),
    end: new Date(event.end ?? NaN).toISOString()
  }
}

describe('parseCalendarEvent DURATION across a DST change (RFC 5545 3.3.6)', () => {
  it('adds the days as wall-clock days when summer time ends', () => {
    const event = parseWithDuration(
      [
        'dtstart',
        { tzid: 'Australia/Hobart' },
        'date-time',
        '2029-04-01T00:00:00'
      ],
      'P1DT1H'
    )

    expect(event.start).toBe('2029-03-31T13:00:00.000Z')
    // 2029-04-02 01:00 in Hobart (AEST, +10:00)
    expect(event.end).toBe('2029-04-01T15:00:00.000Z')
  })

  it('adds the weeks as wall-clock days when summer time begins', () => {
    const event = parseWithDuration(
      ['dtstart', { tzid: 'Europe/Paris' }, 'date-time', '2029-03-20T10:00:00'],
      'P1W'
    )

    // 2029-03-27 10:00 in Paris (CEST, +02:00)
    expect(event.end).toBe('2029-03-27T08:00:00.000Z')
  })

  it('adds the time part as exact time across the change', () => {
    const event = parseWithDuration(
      ['dtstart', { tzid: 'Europe/Paris' }, 'date-time', '2029-03-25T01:00:00'],
      'PT2H'
    )

    // 01:00 CET + 2 exact hours = 04:00 CEST
    expect(event.end).toBe('2029-03-25T02:00:00.000Z')
  })

  it('keeps the exact addition for a UTC start', () => {
    const event = parseWithDuration(
      ['dtstart', {}, 'date-time', '2029-04-01T00:00:00Z'],
      'P1DT1H'
    )

    expect(event.end).toBe('2029-04-02T01:00:00.000Z')
  })
})
