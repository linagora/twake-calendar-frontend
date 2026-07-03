import { renderHook, waitFor } from '@testing-library/react'
import { useBookingData } from '@public/features/booking/hooks/useBookingData'
import { fetchBookingSlots } from '@public/features/booking/BookingDao'
import { BookingSlotsResponse } from '@common/features/booking/types/BookingTypes'

jest.mock('@public/features/booking/BookingDao', () => ({
  fetchBookingSlots: jest.fn()
}))

const mockFetchBookingSlots = fetchBookingSlots as jest.Mock

const mockResponse: BookingSlotsResponse = {
  durationMinutes: 30,
  autoAccept: false,
  owner: {
    displayName: 'John Doe',
    email: 'john.doe@open-paas.org'
  },
  range: {
    from: '2036-01-01T00:00:00.000Z',
    to: '2036-01-31T23:59:59.000Z'
  },
  slots: [
    { start: '2036-01-26T09:00:00.000Z' },
    { start: '2036-01-26T09:30:00.000Z' }
  ]
}

describe('useBookingData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads booking data for the visible month', async () => {
    mockFetchBookingSlots.mockResolvedValueOnce(mockResponse)

    const visibleMonth = new Date(2036, 0, 1)
    const { result } = renderHook(() =>
      useBookingData({
        bookingLinkPublicId: 'public-booking-link-id',
        visibleMonth,
        loadErrorMessage: 'Unable to load slots'
      })
    )

    expect(result.current.initialLoading).toBe(true)
    expect(result.current.monthLoading).toBe(false)

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    expect(mockFetchBookingSlots).toHaveBeenCalledWith(
      'public-booking-link-id',
      '2036-01-01T00:00:00.000Z',
      '2036-01-31T23:59:59.000Z',
      expect.any(String)
    )
    expect(result.current.bookingInfo).toEqual(mockResponse)
    expect(result.current.slots).toEqual(mockResponse.slots)
    expect(result.current.error).toBeNull()
  })

  it('uses month loading, not initial loading, after the first successful load', async () => {
    mockFetchBookingSlots.mockResolvedValueOnce(mockResponse)

    let resolveSecondFetch: (value: BookingSlotsResponse) => void = () => {}
    const secondFetchPromise = new Promise<BookingSlotsResponse>(resolve => {
      resolveSecondFetch = resolve
    })

    const { result, rerender } = renderHook(
      ({ visibleMonth }) =>
        useBookingData({
          bookingLinkPublicId: 'public-booking-link-id',
          visibleMonth,
          loadErrorMessage: 'Unable to load slots'
        }),
      { initialProps: { visibleMonth: new Date(2036, 0, 1) } }
    )

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    mockFetchBookingSlots.mockReturnValueOnce(secondFetchPromise)
    rerender({ visibleMonth: new Date(2036, 1, 1) })

    await waitFor(() => {
      expect(result.current.monthLoading).toBe(true)
    })
    expect(result.current.initialLoading).toBe(false)

    resolveSecondFetch({
      ...mockResponse,
      range: {
        from: '2036-02-01T00:00:00.000Z',
        to: '2036-02-29T23:59:59.000Z'
      },
      slots: [{ start: '2036-02-03T10:00:00.000Z' }]
    })

    await waitFor(() => {
      expect(result.current.monthLoading).toBe(false)
    })

    expect(mockFetchBookingSlots).toHaveBeenLastCalledWith(
      'public-booking-link-id',
      '2036-02-01T00:00:00.000Z',
      '2036-02-29T23:59:59.000Z',
      expect.any(String)
    )
    expect(result.current.slots).toEqual([
      { start: '2036-02-03T10:00:00.000Z' }
    ])
  })

  it('sets the provided translated error message when loading fails', async () => {
    mockFetchBookingSlots.mockRejectedValueOnce(new Error('Network error'))

    const visibleMonth = new Date(2036, 0, 1)
    const { result } = renderHook(() =>
      useBookingData({
        bookingLinkPublicId: 'public-booking-link-id',
        visibleMonth,
        loadErrorMessage: 'Translated load error'
      })
    )

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    expect(result.current.error).toBe('Translated load error')
    expect(result.current.bookingInfo).toBeNull()
    expect(result.current.slots).toEqual([])
  })

  it('does not fetch when there is no booking link public id', () => {
    const visibleMonth = new Date(2036, 0, 1)
    const { result } = renderHook(() =>
      useBookingData({
        bookingLinkPublicId: undefined,
        visibleMonth,
        loadErrorMessage: 'Unable to load slots'
      })
    )

    expect(mockFetchBookingSlots).not.toHaveBeenCalled()
    expect(result.current.initialLoading).toBe(false)
    expect(result.current.slots).toEqual([])
  })
})
