import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { useEffect, useRef, useState } from 'react'
import { fetchBookingSlots } from '../BookingDao'

interface UseBookingDataParams {
  bookingLinkPublicId?: string
  visibleMonth: Date
  loadErrorMessage: string
}

interface UseBookingDataResult {
  slots: Slot[]
  bookingInfo: BookingSlotsResponse | null
  initialLoading: boolean
  monthLoading: boolean
  error: string | null
  refetch: () => void
}

export const useBookingData = ({
  bookingLinkPublicId,
  visibleMonth,
  loadErrorMessage
}: UseBookingDataParams): UseBookingDataResult => {
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookingInfo, setBookingInfo] = useState<BookingSlotsResponse | null>(
    null
  )
  const [initialLoading, setInitialLoading] = useState<boolean>(true)
  const [monthLoading, setMonthLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const hasLoadedOnceRef = useRef<boolean>(false)
  const [refreshVersion, setRefreshVersion] = useState<number>(0)

  useEffect(() => {
    if (!bookingLinkPublicId) {
      return
    }

    let cancelled = false
    const isFirstLoad = !hasLoadedOnceRef.current

    const loadBookingData = async (): Promise<void> => {
      if (isFirstLoad) {
        setInitialLoading(true)
      } else {
        setMonthLoading(true)
      }
      setError(null)

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
          browserDefaultTimeZone
        )

        if (cancelled) {
          return
        }

        setSlots(response.slots)
        setBookingInfo(response)
        hasLoadedOnceRef.current = true
      } catch {
        if (!cancelled) {
          setError(loadErrorMessage)
          setSlots([])
          setBookingInfo(null)
        }
      } finally {
        if (!cancelled) {
          if (isFirstLoad) {
            setInitialLoading(false)
          } else {
            setMonthLoading(false)
          }
        }
      }
    }

    loadBookingData()

    return () => {
      cancelled = true
    }
  }, [bookingLinkPublicId, loadErrorMessage, visibleMonth, refreshVersion])

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
