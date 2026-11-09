/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { fetchEvent } from '@common/features/Events/EventDao'
import { useStoredZone } from '@common/features/Events/hooks/useStoredZone'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'

vi.mock('@common/features/Events/EventDao', () => ({
  fetchEvent: vi.fn()
}))

const stored = [
  'vcalendar',
  [],
  [
    [
      'vevent',
      [
        ['uid', {}, 'text', 'event-1'],
        [
          'dtstart',
          { tzid: 'America/New_York' },
          'date-time',
          '2026-11-04T10:00:00'
        ],
        ['duration', {}, 'duration', 'PT1H']
      ],
      []
    ]
  ]
] as unknown as VCalComponent

// As the grid holds it: in UTC, with the zone of the browser
const fromTheGrid = (overrides: Partial<CalendarEvent> = {}): CalendarEvent =>
  ({
    uid: 'event-1',
    calId: 'u1/cal1',
    URL: '/calendars/u1/cal1/event-1.ics',
    start: '2026-11-04T15:00:00Z',
    end: '2026-11-04T16:00:00Z',
    timezone: 'Europe/Paris',
    allday: false,
    ...overrides
  }) as CalendarEvent

describe('useStoredZone', () => {
  beforeEach(() => {
    vi.mocked(fetchEvent).mockReset()
    vi.mocked(fetchEvent).mockResolvedValue(stored)
  })

  it('is pending until the zone is read, then gives the zone of the stored object', async () => {
    const event = fromTheGrid()

    const { result } = renderHook(() => useStoredZone(event, true))

    expect(result.current.isZonePending).toBe(true)
    await waitFor(() => expect(result.current.isZonePending).toBe(false))
    expect(result.current.eventInStoredZone?.timezone).toBe('America/New_York')
    expect(result.current.eventInStoredZone?.start).toBe(event.start)
  })

  it('makes no request while the form is closed', () => {
    const { result } = renderHook(() => useStoredZone(fromTheGrid(), false))

    expect(fetchEvent).not.toHaveBeenCalled()
    expect(result.current.isZonePending).toBe(false)
  })

  it('reads once per opening, whatever the store does to the event', async () => {
    const { result, rerender } = renderHook(
      ({ event, open }) => useStoredZone(event, open),
      { initialProps: { event: fromTheGrid(), open: true } }
    )
    await waitFor(() => expect(result.current.isZonePending).toBe(false))

    rerender({ event: fromTheGrid({ title: 'Updated' }), open: true })
    await waitFor(() => expect(result.current.isZonePending).toBe(false))

    expect(fetchEvent).toHaveBeenCalledTimes(1)

    rerender({ event: fromTheGrid(), open: false })
    rerender({ event: fromTheGrid(), open: true })
    await waitFor(() => expect(fetchEvent).toHaveBeenCalledTimes(2))
  })

  it.each([
    ['an occurrence', { uid: 'event-1/20261104T150000' }],
    ['an all-day event', { allday: true }],
    [
      'a series',
      { repetition: new RepetitionObject({ freq: 'daily', interval: 1 }) }
    ]
  ])('does not read %s', (_name, overrides) => {
    const event = fromTheGrid(overrides)

    const { result } = renderHook(() => useStoredZone(event, true))

    expect(fetchEvent).not.toHaveBeenCalled()
    expect(result.current.isZonePending).toBe(false)
    expect(result.current.eventInStoredZone).toBe(event)
  })

  it('starts from what the grid knows when the read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchEvent).mockRejectedValue(new Error('403'))
    const event = fromTheGrid()

    const { result } = renderHook(() => useStoredZone(event, true))

    await waitFor(() => expect(result.current.isZonePending).toBe(false))
    expect(result.current.eventInStoredZone?.timezone).toBe('Europe/Paris')
  })

  it('ignores a late read from the previous event', async () => {
    let resolveFirst!: (value: VCalComponent) => void
    const firstRead = new Promise<VCalComponent>(resolve => {
      resolveFirst = resolve
    })
    vi.mocked(fetchEvent).mockReturnValueOnce(firstRead)
    const { result, rerender } = renderHook(
      ({ event }) => useStoredZone(event, true),
      { initialProps: { event: fromTheGrid() } }
    )

    rerender({ event: fromTheGrid({ uid: 'event-2' }) })
    await waitFor(() => expect(result.current.isZonePending).toBe(false))

    await act(async () => {
      resolveFirst(stored)
      await firstRead
    })

    expect(fetchEvent).toHaveBeenCalledTimes(2)
    expect(result.current.isZonePending).toBe(false)
    expect(result.current.eventInStoredZone?.uid).toBe('event-2')
    expect(result.current.eventInStoredZone?.timezone).toBe('America/New_York')
  })

  it('ignores a read completed while closed and reads again on reopening', async () => {
    let resolveRead!: (value: VCalComponent) => void
    const pendingRead = new Promise<VCalComponent>(resolve => {
      resolveRead = resolve
    })
    vi.mocked(fetchEvent).mockReturnValueOnce(pendingRead)
    const event = fromTheGrid()
    const { result, rerender } = renderHook(
      ({ open }) => useStoredZone(event, open),
      { initialProps: { open: true } }
    )

    rerender({ open: false })
    await act(async () => {
      resolveRead(stored)
      await pendingRead
    })
    expect(result.current.eventInStoredZone).toBe(event)
    expect(result.current.isZonePending).toBe(false)

    rerender({ open: true })
    expect(result.current.isZonePending).toBe(true)
    await waitFor(() => expect(result.current.isZonePending).toBe(false))
    expect(fetchEvent).toHaveBeenCalledTimes(2)
    expect(result.current.eventInStoredZone?.timezone).toBe('America/New_York')
  })
})
