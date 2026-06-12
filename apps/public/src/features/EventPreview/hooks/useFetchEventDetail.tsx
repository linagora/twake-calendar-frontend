import { useState, useEffect, useRef } from 'react'
import { CalendarEvent } from '@common/types/EventsTypes'
import { fetchEvent } from '../EventDao'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { useI18n } from 'twake-i18n'
import { HTTPError } from 'ky'

const sanitizeErrorMessage = (message: string): string => {
  return message.replace(/jwt=[A-Za-z0-9-_=~./+%]+/g, 'jwt=...')
}

const getEventDetailErrorMessage = (
  err: unknown,
  t: (key: string) => string
): string => {
  if (err instanceof HTTPError) {
    const status = err.response.status
    if (status === 404) {
      return t('error.eventNotFound')
    }
    if (status === 401 || status === 403) {
      return t('error.invalidOrExpiredToken')
    }
    return sanitizeErrorMessage(err.message)
  }
  const rawMessage = err instanceof Error ? err.message : String(err)
  return sanitizeErrorMessage(rawMessage)
}

export interface EventDetailResult {
  event: CalendarEvent | undefined
  attendeeEmail: string | undefined
  links:
    | {
        yes: string
        no: string
        maybe: string
      }
    | undefined
  loading: boolean
  error: boolean
  errorDetail: string | undefined
}

export const useFetchEventDetail = (
  jwt: string | null,
  calId: string
): EventDetailResult => {
  const { t } = useI18n()
  const [data, setData] = useState<{
    event: CalendarEvent | undefined
    attendeeEmail: string | undefined
    links: { yes: string; no: string; maybe: string } | undefined
  }>({
    event: undefined,
    attendeeEmail: undefined,
    links: undefined
  })

  const [loading, setLoading] = useState<boolean>(!!jwt)
  const [error, setError] = useState<boolean>(!jwt)
  const [errorDetail, setErrorDetail] = useState<string | undefined>(
    !jwt ? t('error.missingToken') : undefined
  )
  const hasLoadedRef = useRef<boolean>(false)

  useEffect((): (() => void) | void => {
    if (!jwt) return

    let isMounted = true

    const loadData = async (): Promise<void> => {
      if (!hasLoadedRef.current) {
        setLoading(true)
      }
      setError(false)
      setErrorDetail(undefined)
      try {
        const response = await fetchEvent(jwt)
        if (!isMounted) return

        const initialEvent: CalendarEvent = {
          URL: '',
          calId,
          uid: '',
          start: '',
          timezone: 'UTC',
          attendee: []
        }

        const parsed = parseFetchedEvent(initialEvent, response.eventJSON)
        if (parsed.uid) {
          parsed.URL = `/calendars/${parsed.calId}/${parsed.uid}.ics`
        }

        setData({
          event: parsed,
          attendeeEmail: response.attendeeEmail,
          links: response.links
        })
        setLoading(false)
        hasLoadedRef.current = true
      } catch (err) {
        console.error('Failed to fetch event participation:', err)
        if (isMounted) {
          setError(true)
          setErrorDetail(getEventDetailErrorMessage(err, t))
          setLoading(false)
        }
      }
    }

    void loadData()

    return (): void => {
      isMounted = false
    }
  }, [jwt, calId, t])

  return {
    event: data.event,
    attendeeEmail: data.attendeeEmail,
    links: data.links,
    loading,
    error,
    errorDetail
  }
}
