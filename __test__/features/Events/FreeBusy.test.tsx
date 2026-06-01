import {
  hasFreeBusyConflict,
  useAttendeesFreeBusy
} from '@/components/Attendees/useFreeBusy'
import * as CalendarDAO from '@/features/Calendars/CalendarDAO'
import * as FreeBusyDao from '@/features/Events/FreeBusyDao'
import * as UserDao from '@/features/User/UserDao'
import { renderHook, waitFor } from '@testing-library/react'

jest.mock('moment-timezone', () => {
  const actual = jest.requireActual('moment-timezone')
  return actual
})

jest.mock('@/features/Events/FreeBusyDao')
jest.mock('@/features/User/UserDao')
jest.mock('@/features/Calendars/CalendarDAO')

const mockGetUserData = UserDao.fetchUserByEmail as jest.MockedFunction<
  typeof UserDao.fetchUserByEmail
>
const mockREPORT = FreeBusyDao.fetchFreeBusyReports as jest.MockedFunction<
  typeof FreeBusyDao.fetchFreeBusyReports
>
const mockPOST = FreeBusyDao.fetchFreeBusyPost as jest.MockedFunction<
  typeof FreeBusyDao.fetchFreeBusyPost
>
const mockGetCalendars = CalendarDAO.fetchCalendars as jest.MockedFunction<
  typeof CalendarDAO.fetchCalendars
>

const mockCalendarsResponse = {
  _embedded: {
    'dav:calendar': [
      {
        _links: {
          self: {
            href: '/calendars/user-carol/user-carol'
          }
        }
      }
    ]
  }
}

const freeIcal = [
  {
    _links: {
      self: {
        href: '\/calendars\/user-carol\/e38d1ea7-6d2c-46c6-8933-cdb325d4458e'
      }
    },
    data: [
      'vcalendar',
      [],
      [
        [
          'vfreebusy',
          [
            ['dtstart', {}, 'date-time', '2026-03-14T14:00:00Z'],
            ['dtend', {}, 'date-time', '2026-03-14T15:00:00Z'],
            ['dtstamp', {}, 'date-time', '2026-03-14T13:00:00Z']
          ],
          []
        ]
      ]
    ]
  }
]

const busyIcal = [
  {
    _links: {
      self: {
        href: '\/calendars\/user-carol\/e38d1ea7-6d2c-46c6-8933-cdb325d4458e'
      }
    },
    data: [
      'vcalendar',
      [],
      [
        [
          'vfreebusy',
          [
            ['dtstart', {}, 'date-time', '2026-03-14T14:00:00Z'],
            ['dtend', {}, 'date-time', '2026-03-14T15:00:00Z'],
            ['dtstamp', {}, 'date-time', '2026-03-14T13:00:00Z'],
            [
              'freebusy',
              {},
              'period',
              ['2026-03-14T14:00:00Z', '2026-03-14T15:00:00Z']
            ]
          ],
          []
        ]
      ]
    ]
  }
]

const START = '2026-03-14T14:00:00'
const END = '2026-03-14T15:00:00'
const TZ = 'Europe/Paris'

const freePostResponse = {
  start: '20260314T130000',
  end: '20260314T140000',
  users: [
    {
      id: 'user-carol',
      calendars: [{ id: 'user-carol', busy: [] }]
    }
  ]
}

const busyPostResponse = {
  start: '20260314T130000',
  end: '20260314T140000',
  users: [
    {
      id: 'user-carol',
      calendars: [
        {
          id: 'user-carol',
          busy: [
            {
              uid: 'fa507111-07d5-44b4-a611-c27845a66ccf',
              start: START,
              end: END
            }
          ]
        }
      ]
    }
  ]
}

describe('hasFreeBusyConflict', () => {
  it('returns false for non-vcalendar data', () => {
    expect(hasFreeBusyConflict({ data: ['not-vcalendar', [], []] })).toBe(false)
  })

  it('returns false when vfreebusy has no freebusy property', () => {
    const data = {
      data: [
        'vcalendar',
        [],
        [
          [
            'vfreebusy',
            [['dtstart', {}, 'date-time', '2026-03-14T14:00:00Z']],
            []
          ]
        ]
      ]
    }
    expect(hasFreeBusyConflict(data)).toBe(false)
  })

  it('returns true when vfreebusy contains a freebusy property', () => {
    const data = {
      data: [
        'vcalendar',
        [],
        [
          [
            'vfreebusy',
            [
              ['dtstart', {}, 'date-time', '2026-03-14T14:00:00Z'],
              ['freebusy', {}, 'period', '2026-03-14T14:00:00Z/PT1H']
            ],
            []
          ]
        ]
      ]
    }
    expect(hasFreeBusyConflict(data)).toBe(true)
  })

  it('returns false for malformed data without throwing', () => {
    expect(hasFreeBusyConflict(null)).toBe(false)
    expect(hasFreeBusyConflict('garbage')).toBe(false)
    expect(hasFreeBusyConflict({ data: null })).toBe(false)
  })
})

describe('useAttendeesFreeBusy — Flow B (new attendees)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCalendars.mockResolvedValue(mockCalendarsResponse as never)
  })

  const newAttendee = { email: 'alice@example.com', userId: 'user-alice' }

  it('shows loading then free for a new attendee', async () => {
    mockGetCalendars.mockResolvedValue(mockCalendarsResponse as never)
    mockREPORT.mockResolvedValue(freeIcal)
    const { result } = renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [],
        newAttendees: [newAttendee],
        start: START,
        end: END,
        timezone: TZ
      })
    )

    expect(result.current[newAttendee.email]).toBe('loading')

    await waitFor(() => expect(result.current[newAttendee.email]).toBe('free'))
  })

  it('shows busy when REPORT returns true', async () => {
    mockGetCalendars.mockResolvedValue(mockCalendarsResponse as never)
    mockREPORT.mockResolvedValue(busyIcal)
    const { result } = renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [],
        newAttendees: [newAttendee],
        start: START,
        end: END,
        timezone: TZ
      })
    )

    await waitFor(() => expect(result.current[newAttendee.email]).toBe('busy'))
  })

  it('shows unknown when REPORT throws', async () => {
    mockREPORT.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [],
        newAttendees: [newAttendee],
        start: START,
        end: END,
        timezone: TZ
      })
    )

    await waitFor(() =>
      expect(result.current[newAttendee.email]).toBe('unknown')
    )
  })

  it('resolves userId via getUserDataFromEmail when not provided', async () => {
    mockGetUserData.mockResolvedValue([{ _id: 'resolved-id' }] as never)
    mockGetCalendars.mockResolvedValue({
      _embedded: {
        'dav:calendar': [
          {
            _links: {
              self: {
                href: '/calendars/resolved-id/resolved-id'
              }
            }
          }
        ]
      }
    } as never)
    mockREPORT.mockResolvedValue(freeIcal)
    const attendeeWithoutId = { email: 'bob@example.com' }

    const { result } = renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [],
        newAttendees: [attendeeWithoutId],
        start: START,
        end: END,
        timezone: TZ
      })
    )

    await waitFor(() =>
      expect(result.current[attendeeWithoutId.email]).toBe('free')
    )
    expect(mockGetUserData).toHaveBeenCalledWith('bob@example.com')
    expect(mockREPORT).toHaveBeenCalledWith(
      expect.objectContaining({
        hrefs: ['/calendars/resolved-id/resolved-id'],
        start: expect.any(String),
        end: expect.any(String)
      })
    )
  })

  it('shows unknown when userId cannot be resolved', async () => {
    mockGetUserData.mockResolvedValue([])

    const { result } = renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [],
        newAttendees: [{ email: 'ghost@example.com' }],
        start: START,
        end: END,
        timezone: TZ
      })
    )

    await waitFor(() =>
      expect(result.current['ghost@example.com']).toBe('unknown')
    )
    expect(mockREPORT).not.toHaveBeenCalled()
  })

  it('does not re-fetch an attendee already fetched', async () => {
    mockGetCalendars.mockResolvedValue(mockCalendarsResponse as never)
    mockREPORT.mockResolvedValue(freeIcal)
    const { result, rerender } = renderHook(
      ({ attendees }) =>
        useAttendeesFreeBusy({
          existingAttendees: [],
          newAttendees: attendees,
          start: START,
          end: END,
          timezone: TZ
        }),
      { initialProps: { attendees: [newAttendee] } }
    )

    await waitFor(() => expect(result.current[newAttendee.email]).toBe('free'))

    rerender({ attendees: [newAttendee] })
    expect(mockREPORT).toHaveBeenCalledTimes(1)
  })

  it('removes departed attendee from the map', async () => {
    mockGetCalendars.mockResolvedValue(mockCalendarsResponse as never)
    mockREPORT.mockResolvedValue(freeIcal)
    const { result, rerender } = renderHook(
      ({ attendees }) =>
        useAttendeesFreeBusy({
          existingAttendees: [],
          newAttendees: attendees,
          start: START,
          end: END,
          timezone: TZ
        }),
      { initialProps: { attendees: [newAttendee] } }
    )

    await waitFor(() => expect(result.current[newAttendee.email]).toBe('free'))

    rerender({ attendees: [] })

    await waitFor(() =>
      expect(result.current[newAttendee.email]).toBeUndefined()
    )
  })

  it('invalidates cache and re-fetches when time window changes', async () => {
    mockGetCalendars.mockResolvedValue(mockCalendarsResponse as never)
    mockREPORT.mockResolvedValue(freeIcal)
    const { result, rerender } = renderHook(
      ({ start, end }) =>
        useAttendeesFreeBusy({
          existingAttendees: [],
          newAttendees: [newAttendee],
          start,
          end,
          timezone: TZ
        }),
      { initialProps: { start: START, end: END } }
    )

    await waitFor(() => expect(result.current[newAttendee.email]).toBe('free'))

    rerender({ start: '2026-03-15T14:00:00', end: '2026-03-15T15:00:00' })

    await waitFor(() => expect(result.current[newAttendee.email]).toBe('free'))

    expect(mockREPORT).toHaveBeenCalledTimes(2)
  })

  it('passes UTC-converted iCal times to the API', async () => {
    mockGetCalendars.mockResolvedValue(mockCalendarsResponse as never)
    mockREPORT.mockResolvedValue(freeIcal)
    renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [],
        newAttendees: [newAttendee],
        start: '2026-03-14T16:00:00', // 16:00 Paris = 15:00 UTC in winter
        end: '2026-03-14T17:00:00',
        timezone: 'Europe/Paris'
      })
    )

    await waitFor(() => expect(mockREPORT).toHaveBeenCalled())

    // Paris is UTC+1 in March (before DST), so 16:00 → 15:00 UTC
    expect(mockREPORT).toHaveBeenCalledWith(
      expect.objectContaining({
        start: '20260314T150000',
        end: '20260314T160000'
      })
    )
  })
})

describe('useAttendeesFreeBusy — Flow A (existing attendees)', () => {
  beforeEach(() => jest.clearAllMocks())

  const existingAttendee = { email: 'carol@example.com', userId: 'user-carol' }

  it('does not fetch when eventUid is missing', () => {
    renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [existingAttendee],
        newAttendees: [],
        start: START,
        end: END,
        timezone: TZ
      })
    )

    expect(mockPOST).not.toHaveBeenCalled()
  })

  it('shows loading then free for existing attendees', async () => {
    mockPOST.mockResolvedValue(freePostResponse)

    const { result } = renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [existingAttendee],
        newAttendees: [],
        start: START,
        end: END,
        timezone: TZ,
        eventUid: 'event-123'
      })
    )

    expect(result.current[existingAttendee.email]).toBe('loading')

    await waitFor(() =>
      expect(result.current[existingAttendee.email]).toBe('free')
    )
  })

  it('shows busy when POST returns busy for userId', async () => {
    mockPOST.mockResolvedValue(busyPostResponse)

    const { result } = renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [existingAttendee],
        newAttendees: [],
        start: START,
        end: END,
        timezone: TZ,
        eventUid: 'event-123'
      })
    )

    await waitFor(() => {
      expect(result.current[existingAttendee.email]).toBe('busy')
    })
  })

  it('shows unknown when POST throws', async () => {
    mockPOST.mockRejectedValue(new Error('server error'))

    const { result } = renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [existingAttendee],
        newAttendees: [],
        start: START,
        end: END,
        timezone: TZ,
        eventUid: 'event-123'
      })
    )

    await waitFor(() =>
      expect(result.current[existingAttendee.email]).toBe('unknown')
    )
  })

  it('passes the eventUid to the POST API', async () => {
    mockPOST.mockResolvedValue(freePostResponse)

    renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [existingAttendee],
        newAttendees: [],
        start: START,
        end: END,
        timezone: TZ,
        eventUid: 'event-abc'
      })
    )

    await waitFor(() => expect(mockPOST).toHaveBeenCalled())
    expect(mockPOST).toHaveBeenCalledWith({
      end: '20260314T140000',
      eventUid: 'event-abc',
      start: '20260314T130000',
      userIds: ['user-carol']
    })
  })
})

describe('useAttendeesFreeBusy — enabled flag', () => {
  it('does not fetch when disabled', () => {
    renderHook(() =>
      useAttendeesFreeBusy({
        existingAttendees: [{ email: 'x@x.com', userId: 'uid' }],
        newAttendees: [{ email: 'y@y.com', userId: 'uid2' }],
        start: START,
        end: END,
        timezone: TZ,
        eventUid: 'event-123',
        enabled: false
      })
    )

    expect(mockPOST).not.toHaveBeenCalled()
    expect(mockREPORT).not.toHaveBeenCalled()
  })
})
