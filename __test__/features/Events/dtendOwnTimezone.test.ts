import ICAL from 'ical.js'
import { CalDavItem } from '@common/features/Calendars/types/CalendarApiTypes'
import { extractCalendarEvents } from '@common/features/Calendars/utils/extractCalendarEvents'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'

const base = {
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  attendee: []
} as unknown as CalendarEvent

const ics = (dates: string[], vtimezone: string[] = []): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    ...vtimezone,
    'BEGIN:VEVENT',
    'UID:event-1@example.com',
    'DTSTAMP:20250101T090000Z',
    ...dates,
    'SUMMARY:Flight',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

const FLIGHT = ics([
  'DTSTART;TZID=Europe/Paris:20250317T100000',
  'DTEND;TZID=America/New_York:20250317T123000'
])

const writtenDtend = (event: CalendarEvent): unknown =>
  new ICAL.Component(calendarEventToJCal(event))
    .getFirstSubcomponent('vevent')
    ?.getFirstProperty('dtend')
    ?.toJSON()

describe('a DTEND whose TZID differs from the one of DTSTART (#2105)', () => {
  it('is read in its own zone', () => {
    const event = parseFetchedEvent(base, FLIGHT, true)

    expect(new Date(event.start).toISOString()).toBe('2025-03-17T09:00:00.000Z')
    expect(new Date(event.end as string).toISOString()).toBe(
      '2025-03-17T16:30:00.000Z'
    )
    expect(event.timezone).toBe('Europe/Paris')
  })

  it('is written back at the same instant, in the zone of the event', () => {
    const event = parseFetchedEvent(base, FLIGHT, true)

    // 16:30Z is 17:30 in Paris (CET) on that day
    expect(writtenDtend(event)).toEqual([
      'dtend',
      { tzid: 'Europe/Paris' },
      'date-time',
      '2025-03-17T17:30:00'
    ])
  })

  it('may end before the wall clock of the start', () => {
    const event = parseFetchedEvent(
      base,
      ics([
        'DTSTART;TZID=Asia/Kolkata:20250317T100000',
        'DTEND;TZID=Europe/Paris:20250317T080000'
      ]),
      true
    )

    expect(new Date(event.start).toISOString()).toBe('2025-03-17T04:30:00.000Z')
    expect(new Date(event.end as string).toISOString()).toBe(
      '2025-03-17T07:00:00.000Z'
    )
  })

  it('is read with its stored VTIMEZONE when the zone is a custom one', () => {
    const event = parseFetchedEvent(
      base,
      ics(
        [
          'DTSTART;TZID=Africa/Bissau:20250317T100000',
          'DTEND;TZID=Customized Time Zone:20250317T123000'
        ],
        [
          'BEGIN:VTIMEZONE',
          'TZID:Customized Time Zone',
          'BEGIN:STANDARD',
          'DTSTART:19700101T000000',
          'TZOFFSETFROM:+0300',
          'TZOFFSETTO:+0300',
          'END:STANDARD',
          'END:VTIMEZONE'
        ]
      ),
      true
    )

    expect(new Date(event.end as string).toISOString()).toBe(
      '2025-03-17T09:30:00.000Z'
    )
  })

  it('is read in its own zone in the grid', () => {
    const [event] = extractCalendarEvents(
      {
        data: ICAL.parse(FLIGHT),
        _links: { self: { href: '/calendars/u1/cal1/event-1.ics' } }
      } as unknown as CalDavItem,
      { cal: { id: 'u1/cal1' } as Calendar }
    )

    expect(new Date(event.end as string).toISOString()).toBe(
      '2025-03-17T16:30:00.000Z'
    )
  })
})
