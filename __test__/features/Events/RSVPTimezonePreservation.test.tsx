import { Calendar } from '@common/types/CalendarTypes'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import * as EventDao from '@common/features/Events/EventDao'
import { handleRSVP } from '@common/components/Event/eventHandlers/eventHandlers'
import { CalendarEvent } from '@common/types/EventsTypes'
import { userData } from '@common/features/User/userDataTypes'

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
    {
      cn: 'Me',
      cal_address: 'me@example.com',
      partstat: 'NEEDS-ACTION',
      rsvp: 'TRUE',
      role: 'REQ-PARTICIPANT',
      cutype: 'INDIVIDUAL'
    }
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
