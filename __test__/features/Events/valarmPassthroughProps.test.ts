import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { CalendarEvent } from '@common/types/EventsTypes'
import { Valarms } from '@common/types/Valarms'
import { VAlarm } from '@common/types/VAlarm'
import ICAL from 'ical.js'

const base = {
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  attendee: []
} as unknown as CalendarEvent

const ics = (valarm: string): string =>
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
    valarm,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

const writtenAlarm = (event: CalendarEvent): ICAL.Component =>
  new ICAL.Component(calendarEventToJCal(event))
    .getFirstSubcomponent('vevent')!
    .getFirstSubcomponent('valarm')!

describe('VALARM properties not modelled by Twake Calendar', () => {
  it('keeps REPEAT and DURATION of a repeating alarm', () => {
    const event = parseFetchedEvent(
      base,
      ics(
        'BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT15M\r\nREPEAT:2\r\nDURATION:PT5M\r\nEND:VALARM'
      ),
      true
    )

    const valarm = writtenAlarm(event)

    expect(valarm.getFirstPropertyValue('repeat')).toBe(2)
    expect(valarm.getFirstPropertyValue('duration')?.toString()).toBe('PT5M')
  })

  it('keeps ATTACH and client specific X- properties', () => {
    const event = parseFetchedEvent(
      base,
      ics(
        [
          'BEGIN:VALARM',
          'ACTION:AUDIO',
          'TRIGGER:-PT15M',
          'ATTACH;FMTTYPE=audio/basic:http://example.com/ring.wav',
          'X-MOZ-LASTACK:20250317T085000Z',
          'END:VALARM'
        ].join('\r\n')
      ),
      true
    )

    const valarm = writtenAlarm(event)

    expect(valarm.getFirstPropertyValue('attach')).toBe(
      'http://example.com/ring.wav'
    )
    expect(valarm.getFirstProperty('attach')?.getParameter('fmttype')).toBe(
      'audio/basic'
    )
    expect(valarm.getFirstPropertyValue('x-moz-lastack')).toBeTruthy()
  })

  it('does not duplicate the modelled properties', () => {
    const event = parseFetchedEvent(
      base,
      ics(
        'BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT15M\r\nDESCRIPTION:Reminder\r\nREPEAT:2\r\nDURATION:PT5M\r\nEND:VALARM'
      ),
      true
    )

    const valarm = writtenAlarm(event)

    expect(valarm.getAllProperties('trigger')).toHaveLength(1)
    expect(valarm.getAllProperties('action')).toHaveLength(1)
    expect(valarm.getAllProperties('description')).toHaveLength(1)
  })

  it('keeps them when the alarm is rebuilt with form defaults', () => {
    const alarm = new VAlarm({
      trigger: '-PT15M',
      action: 'DISPLAY',
      passthroughProps: [['repeat', {}, 'integer', 2]]
    })

    const rebuilt = Valarms.fromFormValues(Valarms.fromList([alarm]), {
      summary: 'Project review'
    }).getAlarm(0)!

    expect(rebuilt.asJcal()[1]).toContainEqual(['repeat', {}, 'integer', 2])
  })

  it('survives a JSON round trip (session storage)', () => {
    const alarm = new VAlarm({
      trigger: '-PT15M',
      action: 'DISPLAY',
      passthroughProps: [['repeat', {}, 'integer', 2]]
    })

    const restored = VAlarm.fromJSON(JSON.parse(JSON.stringify(alarm)))

    expect(restored.asJcal()[1]).toContainEqual(['repeat', {}, 'integer', 2])
  })

  it('writes none on an alarm created in the form', () => {
    const alarm = new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })

    expect(alarm.asJcal()[1].map(([key]) => key)).toEqual([
      'trigger',
      'action',
      'description'
    ])
  })
})
