import { makeCounterProposalPayload } from '@calendar/common/src/features/Events/transformers/makeCounterProposalPayload'
import { parseFetchedEvent } from '@calendar/common/src/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'

function createBaseMockEvent(
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent {
  return {
    URL: 'http://example.com/event',
    calId: 'cal-1',
    uid: 'event-uuid-1',
    start: '2026-09-04T10:00:00',
    end: '2026-09-04T11:00:00',
    timezone: 'Europe/Paris',
    attendee: [
      new userAttendee({
        cal_address: 'attendee@example.com',
        cn: 'Attendee'
      })
    ],
    organizer: new userOrganiser({
      cal_address: 'organizer@example.com',
      cn: 'Organizer'
    }),
    ...overrides
  } as CalendarEvent
}

const defaultProposalParams = {
  senderEmail: 'attendee@example.com',
  recipientEmail: 'organizer@example.com',
  proposedStart: '2026-09-04T14:00:00',
  proposedEnd: '2026-09-04T15:00:00'
}

describe('makeCounterProposalPayload', () => {
  it('should generate a valid counter proposal ICS with timezone', () => {
    const event = createBaseMockEvent()

    const payload = makeCounterProposalPayload({
      ...defaultProposalParams,
      event,
      message: 'Can we reschedule?'
    })

    expect(payload).toBeDefined()
    expect(payload.method).toBe('COUNTER')
    expect(payload.sender).toBe('attendee@example.com')
    expect(payload.recipient).toBe('organizer@example.com')
    expect(payload.ical).toContain('METHOD:COUNTER')
    expect(payload.ical).toContain('COMMENT:Can we reschedule?')
  })

  it('should handle event when event has no timezone (fallback to Etc/UTC)', () => {
    const event = createBaseMockEvent({
      timezone: undefined
    })

    const payload = makeCounterProposalPayload({
      ...defaultProposalParams,
      event
    })

    expect(payload).toBeDefined()
    expect(payload.ical).toContain('METHOD:COUNTER')
    expect(payload.ical).toContain('TZID:Etc/UTC')
  })

  it('should handle all-day event correctly', () => {
    const event = createBaseMockEvent({
      allday: true,
      start: '2026-09-04',
      end: '2026-09-05'
    })

    const payload = makeCounterProposalPayload({
      event,
      senderEmail: defaultProposalParams.senderEmail,
      recipientEmail: defaultProposalParams.recipientEmail,
      proposedStart: '2026-09-06',
      proposedEnd: '2026-09-07'
    })

    expect(payload).toBeDefined()
    expect(payload.ical).toContain('METHOD:COUNTER')
    expect(payload.ical).toContain('VALUE=DATE:20260906')
  })

  it('should handle attendee with undefined optional properties without crashing', () => {
    const event = createBaseMockEvent({
      attendee: [
        Object.assign(new userAttendee(), {
          cal_address: 'attendee@example.com',
          cn: undefined,
          rsvp: undefined,
          role: undefined,
          cutype: undefined
        })
      ]
    })

    const payload = makeCounterProposalPayload({
      ...defaultProposalParams,
      event
    })

    expect(payload).toBeDefined()
  })

  it('should handle attendee with boolean rsvp (true/false) without crashing', () => {
    const event = createBaseMockEvent({
      attendee: [
        Object.assign(new userAttendee(), {
          cal_address: 'attendee@example.com',
          rsvp: true as unknown as 'TRUE'
        })
      ]
    })

    const payload = makeCounterProposalPayload({
      ...defaultProposalParams,
      event
    })

    expect(payload).toBeDefined()
    expect(payload.ical).toContain('METHOD:COUNTER')
    expect(payload.ical).toContain('RSVP=TRUE')
  })

  it('should handle passthrough properties with boolean or numeric parameters without crashing', () => {
    const event = createBaseMockEvent({
      passthroughProps: [
        [
          'x-custom-prop',
          { 'x-boolean': true, 'x-count': 42 },
          'text',
          'custom-value'
        ]
      ]
    })

    const payload = makeCounterProposalPayload({
      ...defaultProposalParams,
      event
    })

    expect(payload).toBeDefined()
    expect(payload.ical).toContain('METHOD:COUNTER')
    expect(payload.ical).toContain('X-CUSTOM-PROP')
  })

  it('should handle user exact ICS event without errors', () => {
    const userIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sabre//Sabre VObject 4.5.7//EN
CALSCALE:GREGORIAN
BEGIN:VTIMEZONE
TZID:Europe/Paris
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:4ae1c2fe-462a-47c5-9678-4b56948e8ba7
DTSTART;TZID=Europe/Paris:20260903T090000
SEQUENCE:3
X-OPENPAAS-VIDEOCONFERENCE:https://meet.linagora.com/qni-mdhd-ecb
SUMMARY:vvvv
DTEND;TZID=Europe/Paris:20260903T100000
ORGANIZER;CN=Twake CALENDAR-DEV-2:mailto:twake-calendar-dev-2@linagora.com
DESCRIPTION:-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~ :~:~:~:~:~:~:~:~::~:~::-\\nJoin Visio : https://meet.linagora.com/qni-mdhd- ecb\\n\\nPlease do not edit this section.\\n-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~ :~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-
ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;ROLE=REQ-PARTICIPANT;CUTYPE=INDIVIDUAL;CN=The Manh LE:mailto:tmle@linagora.com
ATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE;ROLE=CHAIR;CUTYPE=INDIVIDUAL;CN=Twake CALENDAR-DEV-2:mailto:twake-calendar-dev-2@linagora.com
CONFERENCE;VALUE=URI;FEATURE=AUDIO,VIDEO;LABEL=Join video call:https://meet.linagora.com/qni-mdhd-ecb
DTSTAMP:20260904T063908Z
TRANSP:OPAQUE
CLASS:PUBLIC
END:VEVENT
END:VCALENDAR`

    const parsedEvent = parseFetchedEvent(
      {
        uid: '4ae1c2fe-462a-47c5-9678-4b56948e8ba7',
        URL: '/test.ics',
        calId: 'cal-1'
      } as CalendarEvent,
      userIcs
    )

    const payload = makeCounterProposalPayload({
      event: parsedEvent,
      senderEmail: 'tmle@linagora.com',
      recipientEmail: 'twake-calendar-dev-2@linagora.com',
      proposedStart: '2026-09-04T14:00:00',
      proposedEnd: '2026-09-04T15:00:00',
      message: 'test proposal'
    })

    expect(payload).toBeDefined()
    expect(payload.ical).toContain('METHOD:COUNTER')
    expect(payload.ical.length).toBeGreaterThan(0)
  })

  it('should handle conference property with feature array without throwing val.replace error', () => {
    const event: CalendarEvent = {
      URL: 'http://example.com/event',
      calId: 'cal-1',
      uid: '4ae1c2fe-462a-47c5-9678-4b56948e8ba7',
      start: '2026-09-04T10:00:00',
      end: '2026-09-04T11:00:00',
      timezone: 'Europe/Paris',
      attendee: [
        new userAttendee({
          cal_address: 'tmle@linagora.com',
          cn: 'The Manh LE'
        })
      ],
      organizer: new userOrganiser({
        cal_address: 'twake-calendar-dev-2@linagora.com',
        cn: 'Twake CALENDAR-DEV-2'
      }),
      passthroughProps: [
        [
          'conference',
          {
            feature: ['AUDIO', 'VIDEO'],
            label: 'Join video call'
          },
          'uri',
          'https://meet.linagora.com/qni-mdhd-ecb'
        ]
      ]
    }

    const payload = makeCounterProposalPayload({
      event,
      senderEmail: 'tmle@linagora.com',
      recipientEmail: 'twake-calendar-dev-2@linagora.com',
      proposedStart: '2026-09-04T14:00:00',
      proposedEnd: '2026-09-04T15:00:00',
      message: 'test'
    })

    expect(payload).toBeDefined()
    expect(payload.ical).toContain('METHOD:COUNTER')
    expect(payload.ical).toContain('CONFERENCE')
    expect(payload.ical).toContain('FEATURE')
  })
})
