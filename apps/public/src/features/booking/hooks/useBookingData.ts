import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'
import { useEffect, useRef, useState } from 'react'
import { fetchBookingSlots } from '../BookingDao'
import { HTTPError } from 'ky'

interface UseBookingDataParams {
  bookingLinkPublicId?: string
  visibleMonth: Date
  timezone: string
  loadErrorMessage: string
}

interface UseBookingDataResult {
  slots: Slot[]
  bookingInfo: BookingSlotsResponse | null
  initialLoading: boolean
  monthLoading: boolean
  error: string | number | null
  refetch: () => void
}

export const useBookingData = ({
  bookingLinkPublicId,
  visibleMonth,
  timezone,
  loadErrorMessage
}: UseBookingDataParams): UseBookingDataResult => {
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookingInfo, setBookingInfo] = useState<BookingSlotsResponse | null>(
    null
  )
  const [initialLoading, setInitialLoading] = useState<boolean>(true)
  const [monthLoading, setMonthLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | number | null>(null)

  const hasLoadedOnceRef = useRef<boolean>(false)
  const [refreshVersion, setRefreshVersion] = useState<number>(0)

  useEffect(() => {
    if (!bookingLinkPublicId) {
      const removeLoading = (): void => {
        setInitialLoading(false)
      }
      removeLoading()
      return
    }

    let cancelled = false
    const isFirstLoad = !hasLoadedOnceRef.current

    const startLoading = (): void => {
      if (isFirstLoad) {
        setInitialLoading(true)
      } else {
        setMonthLoading(true)
      }
      setError(null)
    }

    const stopLoading = (): void => {
      if (isFirstLoad) {
        setInitialLoading(false)
      } else {
        setMonthLoading(false)
      }
    }

    const handleError = (err: unknown): void => {
      if (err instanceof HTTPError) {
        setError(err.response.status)
      } else {
        setError(loadErrorMessage)
      }
      setSlots([])
      if (isFirstLoad) {
        setBookingInfo(null)
      }
    }

    const loadBookingData = async (): Promise<void> => {
      startLoading()

      try {
        const from = visibleMonth.toISOString()
        const to = new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth() + 1,
          0,
          23,
          59,
          59
        ).toISOString()
        const response = await fetchBookingSlots(
          bookingLinkPublicId,
          from,
          to,
          timezone
        )

        if (cancelled) {
          return
        }

        setSlots(response.slots)
        setBookingInfo(response)
        hasLoadedOnceRef.current = true
      } catch (err) {
        if (cancelled) {
          return
        }
        handleError(err)
      }

      if (!cancelled) {
        stopLoading()
      }
    }

    void loadBookingData()

    return (): void => {
      cancelled = true
    }
  }, [
    bookingLinkPublicId,
    loadErrorMessage,
    visibleMonth,
    refreshVersion,
    timezone
  ])

  const refetch = (): void => {
    setRefreshVersion(v => v + 1)
  }

  return {
    slots,
    bookingInfo,
    initialLoading,
    monthLoading,
    error,
    refetch
  }
}
