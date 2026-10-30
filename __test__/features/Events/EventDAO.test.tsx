import type { Mock } from 'vitest'
import {
  deleteEvent,
  fetchAllRecurrentVevents,
  fetchEventJCal,
  fetchRecurrentSeries,
  importEvent,
  moveEvent,
  putEvent
} from '@common/features/Events/EventDao'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import { calendarEventToJCal } from '@common/features/Events/utils'
import { api } from '@common/utils/apiUtils'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'

vi.mock('@common/utils/apiUtils')

const day = new Date()

const mockEvent: CalendarEvent = {
  uid: 'event1',
  title: 'Test Event',
  timezone: 'UTC',
  calId: '667037022b752d0026472254/cal1',
  URL: '/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics',
  start: day.toISOString(),
  end: day.toISOString(),
  status: 'PUBLIC',
  organizer: new userOrganiser({ cn: 'test', cal_address: 'test@test.com' }),
  attendee: [
    new userAttendee({
      cn: 'test',
      cal_address: 'test@test.com',
      partstat: 'NEEDS-ACTION',
      rsvp: 'TRUE',
      role: 'REQ-PARTICIPANT',
      cutype: 'INDIVIDUAL'
    }),
    new userAttendee({
      cn: 'John',
      cal_address: 'john@test.com',
      partstat: 'NEEDS-ACTION',
      rsvp: 'TRUE',
      role: 'REQ-PARTICIPANT',
      cutype: 'INDIVIDUAL'
    })
  ]
}

describe('eventDAO', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete window.CALDAV_PREFER_HANDLING
  })

  it('putEvent sends PUT request with JCal body', async () => {
    const mockResponse = { status: 201, url: '/dav/cals/test.ics' }
    ;(api as unknown as Mock).mockReturnValue(mockResponse)
    const jCal = calendarEventToJCal(mockEvent)
    const result = await putEvent(mockEvent, jCal)

    expect(api).toHaveBeenCalledWith(
      'dav/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'content-type': 'text/calendar; charset=utf-8' },
        body: JSON.stringify(jCal)
      })
    )
    expect(result).toBe(mockResponse)
  })

  it('putEvent sends strict Prefer header when configured', async () => {
    window.CALDAV_PREFER_HANDLING = 'strict'
    const mockResponse = { status: 201, url: '/dav/cals/test.ics' }
    ;(api as unknown as Mock).mockReturnValue(mockResponse)
    const jCal = calendarEventToJCal(mockEvent)

    await putEvent(mockEvent, jCal)

    expect(api).toHaveBeenCalledWith(
      'dav/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'content-type': 'text/calendar; charset=utf-8',
          Prefer: 'handling=strict'
        },
        body: JSON.stringify(jCal)
      })
    )
  })

  it('putEvent logs when status is 201', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation()
    const mockResponse = { status: 201, url: '/dav/cals/test.ics' }
    ;(api as unknown as Mock).mockReturnValue(mockResponse)

    const jCal = calendarEventToJCal(mockEvent)
    await putEvent(mockEvent, jCal)

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      'Event created successfully:',
      '/dav/cals/test.ics'
    )

    consoleInfoSpy.mockRestore()
  })

  it('moveEvent sends MOVE request with destination header', async () => {
    const mockResponse = { status: 204 }
    ;(api as unknown as Mock).mockReturnValue({
      json: vi.fn().mockResolvedValue(mockResponse)
    })
    await moveEvent(mockEvent, 'newurl.ics')

    expect(api).toHaveBeenCalledWith(
      'dav/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics',
      expect.objectContaining({
        method: 'MOVE',
        headers: {
          destination: 'newurl.ics'
        }
      })
    )
  })

  it('deleteEvent sends DELETE request and returns json response', async () => {
    const mockResponse = { ok: true }
    ;(api as unknown as Mock).mockReturnValue({
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    await deleteEvent({ URL: '/calendars/test.ics' })

    expect(api).toHaveBeenCalledWith('dav/calendars/test.ics', {
      method: 'DELETE'
    })
  })

  describe('reading a calendar object', () => {
    // What the DAV proxy answers on the event URL: jCal, not ICS. Feeding such
    // a payload to the ICS parser used to throw "Cannot read properties of
    // undefined (reading 'propertyGroups')" and abort the RSVP (#1375).
    const STORED_JCAL: VCalComponent = [
      'vcalendar',
      [['prodid', {}, 'text', '-//Linagora//Twake-Calendar//EN']],
      [
        ['vtimezone', [['tzid', {}, 'text', 'Europe/Paris']], []],
        [
          'vevent',
          [
            ['uid', {}, 'text', 'event1'],
            [
              'dtstart',
              { tzid: 'Europe/Paris' },
              'date-time',
              '2026-09-14T11:00:00'
            ],
            ['rrule', {}, 'recur', { freq: 'WEEKLY', interval: 1, wkst: 2 }]
          ],
          []
        ],
        [
          'vevent',
          [
            ['uid', {}, 'text', 'event1'],
            [
              'recurrence-id',
              { tzid: 'Europe/Paris' },
              'date-time',
              '2026-09-21T11:00:00'
            ]
          ],
          []
        ]
      ]
    ]

    beforeEach(() => {
      ;(api.get as Mock).mockResolvedValue({
        json: vi.fn().mockResolvedValue(STORED_JCAL)
      })
    })

    it('fetchEventJCal asks the DAV proxy for jCal', async () => {
      await fetchEventJCal(mockEvent)

      expect(api.get).toHaveBeenCalledWith(
        'dav/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics',
        { headers: { Accept: 'application/calendar+json' } }
      )
    })

    it('fetchEventJCal returns the stored VCALENDAR untouched', async () => {
      expect(await fetchEventJCal(mockEvent)).toEqual(STORED_JCAL)
    })

    it('fetchAllRecurrentVevents keeps the master and its overrides', async () => {
      const vevents = await fetchAllRecurrentVevents(mockEvent)

      expect(vevents).toHaveLength(2)
      expect(vevents.map(([name]) => name)).toEqual(['vevent', 'vevent'])
    })

    it('fetchAllRecurrentVevents spells the numeric RRULE wkst back as a weekday', async () => {
      const [master] = await fetchAllRecurrentVevents(mockEvent)

      const rrule = master[1].find(([name]) => name === 'rrule')

      expect(rrule?.[3]).toEqual({ freq: 'WEEKLY', interval: 1, wkst: 'MO' })
    })

    it('fetchRecurrentSeries keeps the stored VTIMEZONEs next to the VEVENTs', async () => {
      const { vevents, vtimezones } = await fetchRecurrentSeries(mockEvent)

      expect(vevents).toHaveLength(2)
      expect(vtimezones).toEqual([
        ['vtimezone', [['tzid', {}, 'text', 'Europe/Paris']], []]
      ])
    })
  })

  it('import event file', async () => {
    await importEvent('123456789', '/calendar/calLink.json')

    expect(api.post).toHaveBeenCalledWith('api/import', {
      body: JSON.stringify({
        fileId: '123456789',
        target: '/calendar/calLink.json'
      })
    })
  })

  test.each([
    [
      'weekly with byday',
      { freq: 'weekly', interval: 1, byday: ['MO', 'WE', 'FR'] }
    ],
    ['daily with null byday', { freq: 'daily', interval: 1, byday: null }]
  ])('putEvent handles repetition: %s', async (_, repetition) => {
    const mockResponse = { status: 201, url: '/dav/cals/test.ics' }
    ;(api as unknown as Mock).mockReturnValue(mockResponse)

    const event = {
      ...mockEvent,
      repetition: new RepetitionObject({
        ...repetition,
        allday: mockEvent.allday ?? false,
        timezone: mockEvent.timezone ?? 'Europe/Paris'
      })
    }
    const jCal = calendarEventToJCal(event)
    await putEvent(event, jCal)

    expect(api).toHaveBeenCalledWith(
      'dav/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'content-type': 'text/calendar; charset=utf-8' },
        body: JSON.stringify(jCal)
      })
    )
  })
})
