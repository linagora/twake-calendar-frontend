import {
  hasFreeBusyConflict,
  useAttendeesFreeBusy
} from '@/components/Attendees/useFreeBusy'
import * as getFreeBusyREPORT from '@/features/Events/api/getFreeBusyForAddedAttendeesREPORT'
import * as getFreeBusyPOST from '@/features/Events/api/getFreeBusyForEventAttendeesPOST'
import * as getUserData from '@/features/Events/api/getUserDataFromEmail'
import { renderHook, waitFor } from '@testing-library/react'

jest.mock('moment-timezone', () => {
  const actual = jest.requireActual('moment-timezone')
  return actual
})

jest.mock('@/features/Events/api/getUserDataFromEmail')
jest.mock('@/features/Events/api/getFreeBusyForAddedAttendeesREPORT')
jest.mock('@/features/Events/api/getFreeBusyForEventAttendeesPOST')

const mockGetUserData = getUserData.getUserDataFromEmail as jest.MockedFunction<
  typeof getUserData.getUserDataFromEmail
>
const mockREPORT =
  getFreeBusyREPORT.getFreeBusyForAddedAttendeesREPORT as jest.MockedFunction<
    typeof getFreeBusyREPORT.getFreeBusyForAddedAttendeesREPORT
  >
const mockPOST =
  getFreeBusyPOST.getFreeBusyForEventAttendeesPOST as jest.MockedFunction<
    typeof getFreeBusyPOST.getFreeBusyForEventAttendeesPOST
  >

const START = '2026-03-14T14:00:00'
const END = '2026-03-14T15:00:00'
const TZ = 'Europe/Paris'

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
  beforeEach(() => jest.clearAllMocks())

  const newAttendee = { email: 'alice@example.com', userId: 'user-alice' }

  it('shows loading then free for a new attendee', async () => {
    mockREPORT.mockResolvedValue(false)

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
    mockREPORT.mockResolvedValue(true)

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
    mockREPORT.mockResolvedValue(false)

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
      'resolved-id',
      expect.any(String),
      expect.any(String)
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
    mockREPORT.mockResolvedValue(false)

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
    mockREPORT.mockResolvedValue(false)

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
    mockREPORT.mockResolvedValue(false)

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
    mockREPORT.mockResolvedValue(false)

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
      'user-alice',
      '20260314T150000',
      '20260314T160000'
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
    mockPOST.mockResolvedValue({ 'user-carol': false })

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
    mockPOST.mockResolvedValue({ 'user-carol': true })

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
      expect(result.current[existingAttendee.email]).toBe('busy')
    )
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
    mockPOST.mockResolvedValue({ 'user-carol': false })

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
    expect(mockPOST).toHaveBeenCalledWith(
      ['user-carol'],
      expect.any(String),
      expect.any(String),
      'event-abc'
    )
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
