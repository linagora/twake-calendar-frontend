import type { Mock } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { fetchEvent } from '@public/features/EventPreview/EventDao'
import { useRsvpAction } from '@public/features/EventPreview/hooks/useRsvpAction'

vi.mock('@public/features/EventPreview/EventDao', async importOriginal => ({
  ...(await importOriginal<
    typeof import('@public/features/EventPreview/EventDao')
  >()),
  fetchEvent: vi.fn()
}))

const mockFetchEvent = fetchEvent as Mock

describe('useRsvpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchEvent.mockResolvedValue({})
  })

  test('answers with the action of the chosen link and keeps it in the page URL', async () => {
    const setSearchParams = vi.fn()
    const { result } = renderHook(() =>
      useRsvpAction(undefined, undefined, setSearchParams)
    )

    await act(() =>
      result.current.handleRsvpChoice(
        'https://excal.example.com/excal/?jwt=shared-token&action=REJECTED'
      )
    )

    expect(mockFetchEvent).toHaveBeenCalledWith('shared-token', 'REJECTED')
    expect(setSearchParams).toHaveBeenCalledWith({
      jwt: 'shared-token',
      action: 'REJECTED'
    })
  })

  test('keeps working with links whose token holds the action', async () => {
    const setSearchParams = vi.fn()
    const { result } = renderHook(() =>
      useRsvpAction(undefined, undefined, setSearchParams)
    )

    await act(() =>
      result.current.handleRsvpChoice(
        'https://excal.example.com/excal/?jwt=legacy-token'
      )
    )

    expect(mockFetchEvent).toHaveBeenCalledWith('legacy-token', undefined)
    expect(setSearchParams).toHaveBeenCalledWith({ jwt: 'legacy-token' })
  })
})
