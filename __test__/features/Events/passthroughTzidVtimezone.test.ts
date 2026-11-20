import ICAL from 'ical.js'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { CalendarEvent } from '@common/types/EventsTypes'

// RFC 5545 3.2.19: a VTIMEZONE for each TZID written, those of the properties
// the model does not hold included. See #2178.
const base = {
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  attendee: []
} as unknown as CalendarEvent

const CUSTOM_VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Custom Zone',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0330',
  'TZOFFSETTO:+0330',
  'DTSTART:19700101T000000',
  'END:STANDARD',
  'END:VTIMEZONE'
].join('\r\n')

const ics = (originalStart: string, vtimezone = ''): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    vtimezone,
    'BEGIN:VEVENT',
    'UID:event-1@example.com',
    'DTSTAMP:20250101T090000Z',
    'DTSTART;TZID=America/New_York:20250317T100000',
    'DTEND;TZID=America/New_York:20250317T110000',
    `X-MS-OLK-ORIGINALSTART;TZID=${originalStart}:20250317T150000`,
    'SUMMARY:Review',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .filter(Boolean)
    .join('\r\n')

const save = (event: CalendarEvent): ICAL.Component =>
  new ICAL.Component(calendarEventToJCal(event))

const definedTzids = (vcal: ICAL.Component): unknown[] =>
  vcal
    .getAllSubcomponents('vtimezone')
    .map(c => c.getFirstPropertyValue('tzid'))

describe('VTIMEZONE of the TZID of a kept property', () => {
  it('writes the VTIMEZONE of a known zone from the table', () => {
    const vcal = save(parseFetchedEvent(base, ics('Europe/Paris'), true))

    expect(definedTzids(vcal)).toEqual(['America/New_York', 'Europe/Paris'])
  })

  it('keeps the stored VTIMEZONE of a custom zone', () => {
    const event = parseFetchedEvent(
      base,
      ics('Custom Zone', CUSTOM_VTIMEZONE),
      true
    )
    const vcal = save(event)

    expect(definedTzids(vcal)).toEqual(['America/New_York', 'Custom Zone'])
    const custom = vcal
      .getAllSubcomponents('vtimezone')
      .find(c => c.getFirstPropertyValue('tzid') === 'Custom Zone')
    expect(
      custom
        ?.getFirstSubcomponent('standard')
        ?.getFirstProperty('tzoffsetto')
        ?.toICALString()
    ).toBe('TZOFFSETTO:+0330')
  })

  it('skips a TZID neither the table nor the stored object defines', () => {
    const vcal = save(parseFetchedEvent(base, ics('Nowhere/Unknown'), true))

    expect(definedTzids(vcal)).toEqual(['America/New_York'])
  })

  it('writes a single VTIMEZONE when the kept property is in the event zone', () => {
    const vcal = save(parseFetchedEvent(base, ics('America/New_York'), true))

    expect(definedTzids(vcal)).toEqual(['America/New_York'])
  })

  it('keeps no stored VTIMEZONE on an event using only its own zone', () => {
    const event = parseFetchedEvent(base, ics('America/New_York'), true)

    expect(event.storedVtimezones).toBeUndefined()
  })
})
