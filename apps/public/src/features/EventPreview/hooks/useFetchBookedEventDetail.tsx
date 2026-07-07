import { getBookedEvent } from '@/features/booking/BookingDao'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { getSanitizedHttpErrorMessage } from './useEventDetailError'

export interface BookedEventDetailResult {
  event: CalendarEvent | undefined
  loading: boolean
  error: boolean
  errorDetail: string | undefined
  refetch: () => void
}

export const useFetchBookedEventDetail = (
  bookingConfirmationToken: string | undefined
): BookedEventDetailResult => {
  const { t } = useI18n()
  const [event, setEvent] = useState<CalendarEvent | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!!bookingConfirmationToken)
  const [error, setError] = useState<boolean>(!bookingConfirmationToken)
  const [errorDetail, setErrorDetail] = useState<string | undefined>(
    !bookingConfirmationToken ? t('error.missingToken') : undefined
  )
  const hasLoadedRef = useRef<boolean>(false)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  useEffect((): (() => void) | void => {
    if (!bookingConfirmationToken) return

    let isMounted = true

    const loadData = async (): Promise<void> => {
      if (!hasLoadedRef.current) {
        setLoading(true)
      }
      setError(false)
      setErrorDetail(undefined)
      try {
        const response = await getBookedEvent(bookingConfirmationToken)
        if (!isMounted) return

        const initialEvent: CalendarEvent = {
          URL: '',
          calId: '',
          uid: '',
          start: '',
          timezone: 'UTC',
          attendee: []
        }

        const parsed = parseFetchedEvent(initialEvent, response.eventJSON)
        if (parsed.uid) {
          parsed.URL = `/calendars/${parsed.calId}/${parsed.uid}.ics`
        }

        setEvent(parsed)
        setLoading(false)
        hasLoadedRef.current = true
      } catch (err) {
        console.error('Failed to fetch booked event:', err)
        if (isMounted) {
          setError(true)
          setErrorDetail(getSanitizedHttpErrorMessage(err, t))
          setLoading(false)
        }
      }
    }

    void loadData()

    return (): void => {
      isMounted = false
    }
  }, [bookingConfirmationToken, t, refreshKey])

  const refetch = (): void => {
    setRefreshKey(prev => prev + 1)
  }

  return {
    event,
    loading,
    error,
    errorDetail,
    refetch
  }
}
