import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { Attachment } from '@common/types/Attachment'
import { CalendarEvent } from '@common/types/EventsTypes'
import { EventDescriptionBuilder } from '@common/utils/EventDescriptionBuilder'
import ICAL from 'ical.js'

const base = {
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  attendee: []
} as unknown as CalendarEvent

const ics = (extra: string): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    'BEGIN:VEVENT',
    'UID:event-1@example.com',
    'DTSTAMP:20250101T090000Z',
    'DTSTART;TZID=Europe/Paris:20250317T100000',
    'DTEND;TZID=Europe/Paris:20250317T110000',
    'SUMMARY:Project review',
    extra,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

const writtenAttachments = (event: CalendarEvent): ICAL.Property[] =>
  new ICAL.Component(calendarEventToJCal(event))
    .getFirstSubcomponent('vevent')!
    .getAllProperties('attach')

describe('ATTACH round trip', () => {
  it('writes an inline attachment back as binary', () => {
    const event = parseFetchedEvent(
      base,
      ics(
        'ATTACH;FMTTYPE=text/plain;X-FILENAME=a.txt;ENCODING=BASE64;VALUE=BINARY:SGVsbG8gd29ybGQ='
      ),
      true
    )

    const attach = writtenAttachments(event)
    expect(attach).toHaveLength(1)
    expect(attach[0].type).toBe('binary')
    expect(attach[0].getParameter('encoding')).toBe('BASE64')
    expect(attach[0].getParameter('fmttype')).toBe('text/plain')
    expect(attach[0].getParameter('x-filename')).toBe('a.txt')
    expect(String(attach[0].getFirstValue())).toBe('SGVsbG8gd29ybGQ=')
  })

  it('keeps the parameters of a URI attachment not modelled', () => {
    const event = parseFetchedEvent(
      base,
      ics(
        'ATTACH;FMTTYPE=application/pdf;X-FILENAME=agenda.pdf;SIZE=1234;X-APPLE-ID=abc:https://files.example.com/agenda.pdf'
      ),
      true
    )

    const attach = writtenAttachments(event)
    expect(attach).toHaveLength(1)
    expect(attach[0].type).toBe('uri')
    expect(attach[0].getParameter('size')).toBe('1234')
    expect(attach[0].getParameter('x-apple-id')).toBe('abc')
    expect(attach[0].getParameter('fmttype')).toBe('application/pdf')
    expect(attach[0].getFirstValue()).toBe(
      'https://files.example.com/agenda.pdf'
    )
  })

  it('writes an attachment added in the form as a URI', () => {
    expect(
      new Attachment('https://x/f.pdf', 'application/pdf', 'f.pdf').asJcal()
    ).toEqual([
      'attach',
      { fmttype: 'application/pdf', 'x-filename': 'f.pdf' },
      'uri',
      'https://x/f.pdf'
    ])
  })

  it('does not write the content of an inline attachment in the description footer', () => {
    const inline = Attachment.fromJcal(
      { 'x-filename': 'a.txt', encoding: 'BASE64' },
      'binary',
      'SGVsbG8gd29ybGQ='
    )

    const text = new EventDescriptionBuilder('', [inline])
      .withFooter(null)
      .buildPlainText()

    expect(text).toContain('• a.txt')
    expect(text).not.toContain('SGVsbG8gd29ybGQ=')
  })
})
