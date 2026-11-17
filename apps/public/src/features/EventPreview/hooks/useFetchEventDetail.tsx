import { useState, useEffect, useRef } from 'react'
import { CalendarEvent } from '@common/types/EventsTypes'
import { fetchEvent, ParticipationAction } from '../EventDao'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { useI18n } from 'twake-i18n'
import { getSanitizedHttpErrorMessage } from './useEventDetailError'
import { encodeDavSegment } from '@linagora/twake-utils'

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
  calId: string,
  action?: ParticipationAction
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
        const response = await fetchEvent(jwt, action)
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
          parsed.URL = `/calendars/${parsed.calId}/${encodeDavSegment(parsed.uid)}.ics`
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
          setErrorDetail(getSanitizedHttpErrorMessage(err, t))
          setLoading(false)
        }
      }
    }

    void loadData()

    return (): void => {
      isMounted = false
    }
  }, [jwt, calId, action, t])

  return {
    event: data.event,
    attendeeEmail: data.attendeeEmail,
    links: data.links,
    loading,
    error,
    errorDetail
  }
}
