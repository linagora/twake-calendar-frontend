import {
  deleteEvent,
  importEvent,
  moveEvent,
  putEvent
} from '@common/features/Events/EventDao'
import { CalendarEvent, RepetitionObject } from '@common/types/EventsTypes'
import { calendarEventToJCal } from '@common/features/Events/utils'
import { api } from '@common/utils/apiUtils'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'

jest.mock('@common/utils/apiUtils')

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
    jest.clearAllMocks()
    delete window.CALDAV_PREFER_HANDLING
  })

  it('putEvent sends PUT request with JCal body', async () => {
    const mockResponse = { status: 201, url: '/dav/cals/test.ics' }
    ;(api as unknown as jest.Mock).mockReturnValue(mockResponse)
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
    ;(api as unknown as jest.Mock).mockReturnValue(mockResponse)
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
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation()
    const mockResponse = { status: 201, url: '/dav/cals/test.ics' }
    ;(api as unknown as jest.Mock).mockReturnValue(mockResponse)

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
    ;(api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockResponse)
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
    ;(api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    })

    await deleteEvent({ URL: '/calendars/test.ics' })

    expect(api).toHaveBeenCalledWith('dav/calendars/test.ics', {
      method: 'DELETE'
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
    ;(api as unknown as jest.Mock).mockReturnValue(mockResponse)

    const event = {
      ...mockEvent,
      repetition: new RepetitionObject(repetition)
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
