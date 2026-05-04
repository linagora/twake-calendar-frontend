import { useState, useEffect, useMemo } from 'react'
import { CalendarEvent } from '../EventsTypes'
import { getEvent } from '../EventApi'

export function useMasterEvent(
  event: CalendarEvent | null | undefined,
  open: boolean,
  typeOfAction: 'solo' | 'all' | undefined
): {
  masterEvent: CalendarEvent | null
  isLoadingMasterEvent: boolean
  effectiveEvent: CalendarEvent | null | undefined
} {
  const [masterEvent, setMasterEvent] = useState<CalendarEvent | null>(null)
  const [isLoadingMasterEvent, setIsLoadingMasterEvent] = useState(false)

  useEffect(() => {
    if (!event || !open || typeOfAction !== 'all') {
      setMasterEvent(null)
      setIsLoadingMasterEvent(false)
      return
    }

    if (!event.repetition?.freq) {
      setMasterEvent(null)
      setIsLoadingMasterEvent(false)
      return
    }

    const [baseUID, recurrenceId] = event.uid.split('/')
    if (!recurrenceId) {
      setMasterEvent(event)
      setIsLoadingMasterEvent(false)
      return
    }

    let cancelled = false

    const fetchMaster = async (): Promise<void> => {
      setIsLoadingMasterEvent(true)
      try {
        const masterEventToFetch = { ...event, uid: baseUID }
        const fetched = await getEvent(masterEventToFetch, true)
        if (!cancelled) setMasterEvent(fetched)
      } catch (err) {
        console.error('Failed to fetch master event:', err)
        if (!cancelled) setMasterEvent(event)
      } finally {
        setIsLoadingMasterEvent(false)
        if (!cancelled) setIsLoadingMasterEvent(false)
      }
    }

    void fetchMaster()

    return (): void => {
      cancelled = true
    }
  }, [event, open, typeOfAction])

  const effectiveEvent = useMemo(() => {
    const shouldShowMaster =
      typeOfAction === 'all' && !!masterEvent && !isLoadingMasterEvent

    return shouldShowMaster ? masterEvent : event
  }, [typeOfAction, masterEvent, isLoadingMasterEvent, event])

  return { masterEvent, isLoadingMasterEvent, effectiveEvent }
}
