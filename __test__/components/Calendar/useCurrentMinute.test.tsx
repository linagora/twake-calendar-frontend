import { useCurrentMinute } from '@common/components/Calendar/hooks/useCurrentMinute'
import { act, renderHook } from '@testing-library/react'

describe('useCurrentMinute', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-20T10:30:20Z') })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('follows the clock while the calendar stays open', () => {
    const { result } = renderHook(() => useCurrentMinute())
    expect(result.current.toISOString()).toBe('2026-11-20T10:30:20.000Z')

    // Refreshed at the start of the next minute, not a minute after mounting
    act(() => {
      vi.advanceTimersByTime(40 * 1000)
    })
    expect(result.current.toISOString()).toBe('2026-11-20T10:31:00.000Z')

    act(() => {
      vi.advanceTimersByTime(29 * 60 * 1000)
    })
    expect(result.current.toISOString()).toBe('2026-11-20T11:00:00.000Z')
  })

  it('stops refreshing once unmounted', () => {
    const { unmount } = renderHook(() => useCurrentMinute())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
