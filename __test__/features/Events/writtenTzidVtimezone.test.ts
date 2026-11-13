import ICAL from 'ical.js'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { CalendarEvent } from '@common/types/EventsTypes'
import { resolveTimezone } from '@common/utils/timezone'

// RFC 5545 3.2.19: a VTIMEZONE for each TZID written. See #2109.
const base = {
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  attendee: []
} as unknown as CalendarEvent

const GMT_MINUS_14_VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Etc/GMT-14',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+1400',
  'TZOFFSETTO:+1400',
  'DTSTART:19700101T000000',
  'END:STANDARD',
  'END:VTIMEZONE'
].join('\r\n')

const ics = (tzid: string, vtimezone = ''): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    vtimezone,
    'BEGIN:VEVENT',
    'UID:event-1@example.com',
    'DTSTAMP:20250101T090000Z',
    `DTSTART;TZID=${tzid}:20250317T100000`,
    `DTEND;TZID=${tzid}:20250317T110000`,
    'SUMMARY:Review',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .filter(Boolean)
    .join('\r\n')

const save = (event: CalendarEvent): ICAL.Component =>
  new ICAL.Component(calendarEventToJCal(event))

const read = (vcal: ICAL.Component): CalendarEvent =>
  parseFetchedEvent(base, vcal.toString(), true)

const dtstart = (vcal: ICAL.Component): ICAL.Property => {
  const property = vcal
    .getFirstSubcomponent('vevent')
    ?.getFirstProperty('dtstart')
  if (!property) throw new Error('No DTSTART written')
  return property
}

const definedTzids = (vcal: ICAL.Component): unknown[] =>
  vcal
    .getAllSubcomponents('vtimezone')
    .map(c => c.getFirstPropertyValue('tzid'))

describe('calendarEventToJCal', () => {
  it.each([
    ['Etc/GMT-14', GMT_MINUS_14_VTIMEZONE],
    ['Pacific Standard Time (Mexico)', '']
  ])('writes a VTIMEZONE for the TZID of the dates (%s)', (tzid, vtz) => {
    const vcal = save(parseFetchedEvent(base, ics(tzid, vtz), true))

    const used = dtstart(vcal).getParameter('tzid')
    if (used) expect(definedTzids(vcal)).toContain(used)
  })

  it('writes a zone the table has no VTIMEZONE for in UTC', () => {
    const vcal = save(
      parseFetchedEvent(base, ics('Etc/GMT-14', GMT_MINUS_14_VTIMEZONE), true)
    )

    expect(dtstart(vcal).getParameter('tzid')).toBeUndefined()
    expect(dtstart(vcal).toJSON()[3]).toBe('2025-03-16T20:00:00Z')
  })

  it('writes a Windows name under the zone of the table it stands for', () => {
    const vcal = save(
      parseFetchedEvent(base, ics('Pacific Standard Time (Mexico)'), true)
    )

    expect(dtstart(vcal).getParameter('tzid')).toBe('America/Tijuana')
    expect(dtstart(vcal).toJSON()[3]).toBe('2025-03-17T10:00:00')
    expect(definedTzids(vcal)).toEqual(['America/Tijuana'])
  })

  it('keeps the TZID of a Windows name on a second save', () => {
    const first = save(
      parseFetchedEvent(base, ics('Pacific Standard Time (Mexico)'), true)
    )
    const second = save(read(first))

    expect(dtstart(second).toJSON()).toEqual(dtstart(first).toJSON())
    expect(definedTzids(second)).toEqual(definedTzids(first))
  })

  it('keeps the instants of a zone written in UTC on a second save', () => {
    const first = save(
      parseFetchedEvent(base, ics('Etc/GMT-14', GMT_MINUS_14_VTIMEZONE), true)
    )
    const second = save(read(first))

    const instant = (date?: string): number => new Date(date ?? '').getTime()
    expect(instant(read(second).start)).toBe(instant(read(first).start))
    expect(instant(read(second).end)).toBe(instant(read(first).end))
    expect(instant(read(second).end)).toBe(Date.parse('2025-03-16T21:00:00Z'))
    const used = dtstart(second).getParameter('tzid')
    if (used) expect(definedTzids(second)).toContain(used)
  })

  it('still writes a zone of the table under its TZID', () => {
    const vcal = save(parseFetchedEvent(base, ics('Europe/Paris'), true))

    expect(dtstart(vcal).getParameter('tzid')).toBe('Europe/Paris')
    expect(definedTzids(vcal)).toEqual(['Europe/Paris'])
  })
})

describe('resolveTimezone', () => {
  it('follows an alias chain up to a zone of the table', () => {
    expect(resolveTimezone('Pacific Standard Time (Mexico)')).toBe(
      'America/Tijuana'
    )
    expect(resolveTimezone('America/Santa_Isabel')).toBe('America/Tijuana')
  })

  it('keeps a zone of the table and an unknown name as given', () => {
    expect(resolveTimezone('Europe/Paris')).toBe('Europe/Paris')
    expect(resolveTimezone('Etc/GMT-14')).toBe('Etc/GMT-14')
    expect(resolveTimezone('Not/A_Zone')).toBe('Not/A_Zone')
  })
})
