import { useState, useEffect, useMemo } from 'react'
import { fetchEvent } from '@common/features/Events/EventDao'
import { CalendarEvent } from '@common/types/EventsTypes'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { findFieldValue } from '@common/features/Events/utils'
import { splitEventKey } from '@common/utils/extractEventBaseUuid'

const isOverride = ([name, props]: VCalComponent): boolean =>
  name.toLowerCase() === 'vevent' && !!findFieldValue(props, 'recurrence-id')

const hasOverride = (jCal: VCalComponent): boolean =>
  (jCal?.[2] ?? []).some(isOverride)

export function useMasterEvent(
  event: CalendarEvent | null | undefined,
  open: boolean,
  typeOfAction: 'solo' | 'all' | undefined
): {
  masterEvent: CalendarEvent | null
  isLoadingMasterEvent: boolean
  effectiveEvent: CalendarEvent | null | undefined
  hasOverrides: boolean
  isMasterPending: boolean
} {
  const [masterEvent, setMasterEvent] = useState<CalendarEvent | null>(null)
  const [isLoadingMasterEvent, setIsLoadingMasterEvent] = useState(false)
  const [hasOverrides, setHasOverrides] = useState(false)
  // The occurrence whose master fetch settled, successfully or not
  const [masterSettledFor, setMasterSettledFor] = useState<string | null>(null)

  useEffect(() => {
    setHasOverrides(false)
    if (!event || !open || typeOfAction !== 'all') {
      setMasterEvent(null)
      setIsLoadingMasterEvent(false)
      return
    }

    // An occurrence belongs to a series even when the grid lost its rule: a
    // refresh re-expands the series without it
    const { baseUid: baseUID, occurrenceKey: recurrenceId } = splitEventKey(
      event.uid
    )
    if (!event.repetition?.freq && !recurrenceId) {
      setMasterEvent(null)
      setIsLoadingMasterEvent(false)
      return
    }

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
        const response = await fetchEvent(masterEventToFetch)
        const fetched = parseFetchedEvent(masterEventToFetch, response, true)

        if (!cancelled) {
          setMasterEvent(fetched)
          setHasOverrides(hasOverride(response))
        }
      } catch (err) {
        console.error('Failed to fetch master event:', err)
        if (!cancelled) setMasterEvent(event)
      } finally {
        setIsLoadingMasterEvent(false)
        if (!cancelled) {
          setIsLoadingMasterEvent(false)
          setMasterSettledFor(event.uid)
        }
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

  // Editing all the events from an occurrence: until its master is known the
  // form would start from the occurrence date, and saving it would move the
  // whole series there
  const isMasterPending =
    open &&
    typeOfAction === 'all' &&
    !!event?.uid.includes('/') &&
    (isLoadingMasterEvent || masterSettledFor !== event.uid)

  return {
    masterEvent,
    isLoadingMasterEvent,
    effectiveEvent,
    hasOverrides,
    isMasterPending
  }
}
