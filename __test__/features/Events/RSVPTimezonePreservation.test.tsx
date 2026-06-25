import { Calendar } from '@common/types/CalendarTypes'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import * as EventDao from '@common/features/Events/EventDao'
import { handleRSVP } from '@common/components/Event/eventHandlers/eventHandlers'
import { CalendarEvent } from '@common/types/EventsTypes'
import { userData } from '@common/features/User/userDataTypes'
import { userAttendee } from '@common/features/User/models/attendee'

// The DTSTART the server stores, in Europe/Paris. This is what must survive a
// PARTSTAT update untouched (regression test for #1031).
const STORED_JCAL: VCalComponent = [
  'vcalendar',
  [],
  [
    ['vtimezone', [['tzid', {}, 'text', 'Europe/Paris']], []],
    [
      'vevent',
      [
        ['uid', {}, 'text', 'event-abc-uid'],
        ['summary', {}, 'text', 'Team standup'],
        [
          'dtstart',
          { tzid: 'Europe/Paris' },
          'date-time',
          '2026-06-17T02:00:00'
        ],
        ['dtend', { tzid: 'Europe/Paris' }, 'date-time', '2026-06-17T02:30:00'],
        ['dtstamp', {}, 'date-time', '2026-06-01T00:00:00Z'],
        [
          'attendee',
          {
            partstat: 'NEEDS-ACTION',
            rsvp: 'TRUE',
            role: 'REQ-PARTICIPANT',
            cutype: 'INDIVIDUAL'
          },
          'cal-address',
          'mailto:me@example.com'
        ]
      ],
      []
    ]
  ]
]

const CALENDAR: Calendar = {
  id: 'cal-1',
  name: 'My calendar',
  owner: { emails: ['me@example.com'] }
} as Calendar

const USER = { email: 'me@example.com' } as userData

// The in-memory event whose timezone has been lost after a server round-trip.
// Regenerating the jCal from this event is what used to corrupt DTSTART.
const STALE_EVENT = {
  uid: 'event-abc-uid',
  title: 'Team standup',
  start: '2026-06-17T00:00:00.000Z',
  end: '2026-06-17T00:30:00.000Z',
  timezone: undefined,
  allday: false,
  URL: '/calendars/cal-1/event-abc.ics',
  attendee: [
    new userAttendee({
      cn: 'Me',
      cal_address: 'me@example.com',
      partstat: 'NEEDS-ACTION',
      rsvp: 'TRUE',
      role: 'REQ-PARTICIPANT',
      cutype: 'INDIVIDUAL'
    })
  ]
} as unknown as CalendarEvent

function veventProps(jCal: VCalComponent): VObjectProperty[] {
  const components = jCal[2] as VCalComponent[]
  const vevent = components.find(c => c[0] === 'vevent')
  return (vevent?.[1] as VObjectProperty[]) ?? []
}

function dtstartOf(jCal: VCalComponent): VObjectProperty | undefined {
  return veventProps(jCal).find(p => p[0].toLowerCase() === 'dtstart')
}

function attendeeOf(jCal: VCalComponent): VObjectProperty | undefined {
  return veventProps(jCal).find(p => p[0] === 'attendee')
}

describe('#1031 partstat update preserves DTSTART timezone', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest
      .spyOn(EventDao, 'fetchEventJCal')
      .mockResolvedValue(
        JSON.parse(JSON.stringify(STORED_JCAL)) as VCalComponent
      )
  })

  it('updates only PARTSTAT in the stored jCal, leaving DTSTART intact', async () => {
    const putSpy = jest
      .spyOn(EventDao, 'putEvent')
      .mockResolvedValue({ ok: true, status: 200 } as Response)
    const dispatch = jest.fn()

    await handleRSVP({
      dispatch,
      calendar: CALENDAR,
      user: USER,
      event: STALE_EVENT,
      rsvp: 'TENTATIVE'
    })

    expect(putSpy).toHaveBeenCalledTimes(1)
    const putJCal = putSpy.mock.calls[0][1] as VCalComponent

    // DTSTART is preserved byte-for-byte (TZID kept, no UTC normalization).
    expect(dtstartOf(putJCal)).toEqual([
      'dtstart',
      { tzid: 'Europe/Paris' },
      'date-time',
      '2026-06-17T02:00:00'
    ])

    // PARTSTAT was actually updated.
    const attendeeParams = attendeeOf(putJCal)?.[1] as Record<string, string>
    expect(attendeeParams.partstat).toBe('TENTATIVE')

    // The lossy regeneration path (redux thunk) was not used.
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('falls back to regeneration when the attendee is absent from the event', async () => {
    const noMatchJCal: VCalComponent = [
      'vcalendar',
      [],
      [
        [
          'vevent',
          [
            ['uid', {}, 'text', 'event-abc-uid'],
            [
              'attendee',
              { partstat: 'NEEDS-ACTION', cutype: 'INDIVIDUAL' },
              'cal-address',
              'mailto:someone-else@example.com'
            ]
          ],
          []
        ]
      ]
    ]
    jest.spyOn(EventDao, 'fetchEventJCal').mockResolvedValue(noMatchJCal)
    const putSpy = jest
      .spyOn(EventDao, 'putEvent')
      .mockResolvedValue({ ok: true, status: 200 } as Response)
    const dispatch = jest.fn()

    await handleRSVP({
      dispatch,
      calendar: CALENDAR,
      user: USER,
      event: STALE_EVENT,
      rsvp: 'TENTATIVE'
    })

    expect(putSpy).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('falls back to regeneration when there is no user email', async () => {
    const fetchSpy = jest.spyOn(EventDao, 'fetchEventJCal')
    const putSpy = jest
      .spyOn(EventDao, 'putEvent')
      .mockResolvedValue({ ok: true, status: 200 } as Response)
    const dispatch = jest.fn()

    await handleRSVP({
      dispatch,
      calendar: CALENDAR,
      user: {} as userData,
      event: STALE_EVENT,
      rsvp: 'TENTATIVE'
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(putSpy).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
})

// VCALENDAR with a master VEVENT (RRULE) and two exception VEVENTs.
// Mirrors the ICS from the bug report (#1088): a weekly recurring meeting
// where the user tries to update their PARTSTAT on a specific occurrence.
const RECURRING_JCAL: VCalComponent = [
  'vcalendar',
  [],
  [
    ['vtimezone', [['tzid', {}, 'text', 'Europe/Brussels']], []],
    [
      'vevent',
      [
        ['uid', {}, 'text', 'recurring-uid'],
        ['summary', {}, 'text', 'Weekly sync'],
        [
          'dtstart',
          { tzid: 'Europe/Brussels' },
          'date-time',
          '2025-09-19T10:15:00'
        ],
        ['dtend', { tzid: 'Europe/Brussels' }, 'date-time', '2025-09-19T11:00:00'],
        ['rrule', {}, 'recur', { freq: 'WEEKLY', interval: 1 }],
        [
          'attendee',
          { partstat: 'ACCEPTED', role: 'REQ-PARTICIPANT', cutype: 'INDIVIDUAL' },
          'cal-address',
          'mailto:me@example.com'
        ]
      ],
      []
    ],
    [
      'vevent',
      [
        ['uid', {}, 'text', 'recurring-uid'],
        ['summary', {}, 'text', 'Weekly sync'],
        [
          'dtstart',
          { tzid: 'Europe/Brussels' },
          'date-time',
          '2026-06-19T10:15:00'
        ],
        ['dtend', { tzid: 'Europe/Brussels' }, 'date-time', '2026-06-19T11:00:00'],
        [
          'recurrence-id',
          { tzid: 'Europe/Brussels' },
          'date-time',
          '2026-06-19T10:15:00'
        ],
        [
          'attendee',
          { partstat: 'ACCEPTED', role: 'REQ-PARTICIPANT', cutype: 'INDIVIDUAL' },
          'cal-address',
          'mailto:me@example.com'
        ]
      ],
      []
    ],
    [
      'vevent',
      [
        ['uid', {}, 'text', 'recurring-uid'],
        ['summary', {}, 'text', 'Weekly sync'],
        [
          'dtstart',
          { tzid: 'Etc/UTC' },
          'date-time',
          '2026-06-26T08:15:00'
        ],
        ['dtend', { tzid: 'Etc/UTC' }, 'date-time', '2026-06-26T09:00:00'],
        [
          'recurrence-id',
          { tzid: 'Etc/UTC' },
          'date-time',
          '2026-06-26T08:15:00'
        ],
        [
          'attendee',
          { partstat: 'ACCEPTED', role: 'REQ-PARTICIPANT', cutype: 'INDIVIDUAL' },
          'cal-address',
          'mailto:me@example.com'
        ]
      ],
      []
    ]
  ]
]

// Helper to find all VEVENTs in a patched jCal.
function veventsOf(jCal: VCalComponent): VCalComponent[] {
  return (jCal[2] as VCalComponent[]).filter(c => c[0] === 'vevent')
}

function attendeePartstatOf(vevent: VCalComponent): string | undefined {
  const props = vevent[1] as VObjectProperty[]
  const attendee = props.find(p => p[0] === 'attendee')
  return (attendee?.[1] as Record<string, string>)?.partstat
}

function recurrenceIdOf(vevent: VCalComponent): string | undefined {
  const props = vevent[1] as VObjectProperty[]
  const rid = props.find(p => p[0] === 'recurrence-id')
  return rid?.[3] as string | undefined
}

describe('#1088 solo RSVP on recurring event patches only the target exception', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest
      .spyOn(EventDao, 'fetchEventJCal')
      .mockResolvedValue(
        JSON.parse(JSON.stringify(RECURRING_JCAL)) as VCalComponent
      )
  })

  it('updates PARTSTAT only in the matching exception VEVENT, leaving others intact', async () => {
    const putSpy = jest
      .spyOn(EventDao, 'putEvent')
      .mockResolvedValue({ ok: true, status: 200 } as Response)
    const dispatch = jest.fn()

    const exceptionEvent = {
      uid: 'recurring-uid/2026-06-19T10:15:00',
      recurrenceId: '2026-06-19T10:15:00',
      URL: '/calendars/cal-1/recurring.ics',
      attendee: [
        new userAttendee({
          cal_address: 'me@example.com',
          partstat: 'ACCEPTED',
          role: 'REQ-PARTICIPANT',
          cutype: 'INDIVIDUAL'
        })
      ]
    } as unknown as CalendarEvent

    await handleRSVP({
      dispatch,
      calendar: CALENDAR,
      user: USER,
      event: exceptionEvent,
      rsvp: 'DECLINED',
      typeOfAction: 'solo'
    })

    expect(putSpy).toHaveBeenCalledTimes(1)
    const putJCal = putSpy.mock.calls[0][1] as VCalComponent
    const vevents = veventsOf(putJCal)

    // All three VEVENTs must survive in the jCal.
    expect(vevents).toHaveLength(3)

    // Only the 2026-06-19 exception should have its PARTSTAT updated.
    const master = vevents.find(v => recurrenceIdOf(v) === undefined)
    const exc0619 = vevents.find(v => recurrenceIdOf(v) === '2026-06-19T10:15:00')
    const exc0626 = vevents.find(v => recurrenceIdOf(v) === '2026-06-26T08:15:00')

    expect(attendeePartstatOf(master!)).toBe('ACCEPTED')
    expect(attendeePartstatOf(exc0619!)).toBe('DECLINED')
    expect(attendeePartstatOf(exc0626!)).toBe('ACCEPTED')

    // The lossy regeneration path (redux thunk) must not be used.
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('preserves the RECURRENCE-ID and DTSTART of the patched exception byte-for-byte', async () => {
    jest
      .spyOn(EventDao, 'putEvent')
      .mockResolvedValue({ ok: true, status: 200 } as Response)
    const dispatch = jest.fn()

    const exceptionEvent = {
      uid: 'recurring-uid/2026-06-26T08:15:00',
      recurrenceId: '2026-06-26T08:15:00',
      URL: '/calendars/cal-1/recurring.ics',
      attendee: [
        new userAttendee({
          cal_address: 'me@example.com',
          partstat: 'ACCEPTED',
          role: 'REQ-PARTICIPANT',
          cutype: 'INDIVIDUAL'
        })
      ]
    } as unknown as CalendarEvent

    const putSpy = jest.spyOn(EventDao, 'putEvent')

    await handleRSVP({
      dispatch,
      calendar: CALENDAR,
      user: USER,
      event: exceptionEvent,
      rsvp: 'TENTATIVE',
      typeOfAction: 'solo'
    })

    const putJCal = putSpy.mock.calls[0][1] as VCalComponent
    const vevents = veventsOf(putJCal)
    const exc0626 = vevents.find(v => recurrenceIdOf(v) === '2026-06-26T08:15:00')!

    // DTSTART with Etc/UTC timezone must be preserved exactly (not re-generated
    // via makeVevent which would corrupt the time when the browser is not in UTC).
    const dtstart = (exc0626[1] as VObjectProperty[]).find(
      p => p[0] === 'dtstart'
    )
    expect(dtstart).toEqual([
      'dtstart',
      { tzid: 'Etc/UTC' },
      'date-time',
      '2026-06-26T08:15:00'
    ])

    // PARTSTAT updated.
    expect(attendeePartstatOf(exc0626)).toBe('TENTATIVE')
  })

  it('falls back to the regeneration thunk when the attendee is absent from the exception', async () => {
    const noAttendeeJCal: VCalComponent = [
      'vcalendar',
      [],
      [
        [
          'vevent',
          [
            ['uid', {}, 'text', 'recurring-uid'],
            [
              'recurrence-id',
              { tzid: 'Europe/Brussels' },
              'date-time',
              '2026-06-19T10:15:00'
            ],
            [
              'attendee',
              { partstat: 'ACCEPTED', cutype: 'INDIVIDUAL' },
              'cal-address',
              'mailto:someone-else@example.com'
            ]
          ],
          []
        ]
      ]
    ]
    jest.spyOn(EventDao, 'fetchEventJCal').mockResolvedValue(noAttendeeJCal)
    jest
      .spyOn(EventDao, 'putEvent')
      .mockResolvedValue({ ok: true, status: 200 } as Response)
    const dispatch = jest.fn()

    const exceptionEvent = {
      uid: 'recurring-uid/2026-06-19T10:15:00',
      recurrenceId: '2026-06-19T10:15:00',
      URL: '/calendars/cal-1/recurring.ics',
      attendee: []
    } as unknown as CalendarEvent

    await handleRSVP({
      dispatch,
      calendar: CALENDAR,
      user: USER,
      event: exceptionEvent,
      rsvp: 'DECLINED',
      typeOfAction: 'solo'
    })

    expect(dispatch).toHaveBeenCalledTimes(1)
  })
})
