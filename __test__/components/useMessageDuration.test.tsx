import { useMessageDuration } from '@common/components/Loading/useMessageDuration'
import { setHighContrastEnabled } from '@common/features/Settings/Accessibility/highContrastMode'
import { act, renderHook } from '@testing-library/react'

describe('useMessageDuration', () => {
  beforeEach(() => localStorage.clear())

  it('keeps the designed duration with the high contrast mode off', () => {
    const { result } = renderHook(() => useMessageDuration(2000, 'success'))
    expect(result.current).toBe(2000)
  })

  it('lasts at least 10 seconds in high contrast mode', () => {
    act(() => setHighContrastEnabled(true))
    const { result } = renderHook(() => useMessageDuration(2000, 'success'))
    expect(result.current).toBe(10_000)
  })

  it('keeps errors until dismissed in high contrast mode', () => {
    act(() => setHighContrastEnabled(true))
    const { result } = renderHook(() => useMessageDuration(4000, 'error'))
    expect(result.current).toBeNull()
  })
})
