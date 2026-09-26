import { useResourcesFreeBusy } from '@common/components/Attendees/useResourcesFreeBusy'
import * as CalendarDAO from '@common/features/Calendars/CalendarDAO'
import * as FreeBusyDao from '@common/features/Events/FreeBusyDao'
import * as UserDao from '@common/features/User/UserDao'
import { renderHook, waitFor } from '@testing-library/react'

jest.mock('@common/features/Events/FreeBusyDao')
jest.mock('@common/features/User/UserDao')
jest.mock('@common/features/Calendars/CalendarDAO')

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

const START = '2026-03-14T14:00:00'
const END = '2026-03-14T15:00:00'
const TZ = 'Europe/Paris'

const ROOM_ID = '69b3c1d2e4f5a6b7c8d9e0f1'
const room = {
  email: `${ROOM_ID}@example.com`,
  displayName: 'Board room',
  openpaasId: ROOM_ID
}

const busyIcal = [
  {
    data: [
      'vcalendar',
      [],
      [
        [
          'vfreebusy',
          [
            [
              'freebusy',
              {},
              'period',
              ['2026-03-14T13:00:00Z', '2026-03-14T14:00:00Z']
            ]
          ],
          []
        ]
      ]
    ]
  }
]

const postResponse = (busy: { uid: string }[]): unknown => ({
  users: [{ id: ROOM_ID, calendars: [{ id: ROOM_ID, busy }] }]
})

describe('useResourcesFreeBusy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCalendars.mockResolvedValue({
      _embedded: {
        'dav:calendar': [
          { _links: { self: { href: `/calendars/${ROOM_ID}/${ROOM_ID}` } } }
        ]
      }
    } as never)
  })

  it('shows a resource booked at that time as busy while creating', async () => {
    mockREPORT.mockResolvedValue(busyIcal)

    const { result } = renderHook(() =>
      useResourcesFreeBusy({
        resources: [room],
        start: START,
        end: END,
        timezone: TZ
      })
    )

    await waitFor(() => expect(result.current[room.email]).toBe('busy'))
    expect(mockGetCalendars).toHaveBeenCalledWith(
      ROOM_ID,
      'withFreeBusy=true&withRights=true'
    )
    expect(mockPOST).not.toHaveBeenCalled()
  })

  it('ignores the edited event itself when looking at a resource', async () => {
    mockPOST.mockResolvedValue(postResponse([{ uid: 'event-123' }]))

    const { result } = renderHook(() =>
      useResourcesFreeBusy({
        resources: [room],
        start: START,
        end: END,
        timezone: TZ,
        eventUid: 'event-123'
      })
    )

    await waitFor(() => expect(result.current[room.email]).toBe('free'))
    expect(mockPOST).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [ROOM_ID], eventUid: 'event-123' })
    )
  })

  it('shows a resource taken by another event as busy while editing', async () => {
    mockPOST.mockResolvedValue(postResponse([{ uid: 'another-event' }]))

    const { result } = renderHook(() =>
      useResourcesFreeBusy({
        resources: [room],
        start: START,
        end: END,
        timezone: TZ,
        eventUid: 'event-123'
      })
    )

    await waitFor(() => expect(result.current[room.email]).toBe('busy'))
  })

  it('finds the calendar of a resource read back from an event by its email', async () => {
    mockPOST.mockResolvedValue(postResponse([]))

    const { result } = renderHook(() =>
      useResourcesFreeBusy({
        resources: [{ email: room.email, displayName: room.displayName }],
        start: START,
        end: END,
        timezone: TZ,
        eventUid: 'event-123'
      })
    )

    await waitFor(() => expect(result.current[room.email]).toBe('free'))
    expect(mockPOST).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [ROOM_ID] })
    )
    expect(mockGetUserData).not.toHaveBeenCalled()
  })

  it('does not fetch without a time range', () => {
    renderHook(() =>
      useResourcesFreeBusy({
        resources: [room],
        start: '',
        end: '',
        timezone: TZ,
        eventUid: 'event-123'
      })
    )

    expect(mockPOST).not.toHaveBeenCalled()
    expect(mockREPORT).not.toHaveBeenCalled()
  })
})
