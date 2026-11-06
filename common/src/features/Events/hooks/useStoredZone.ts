import { useEffect, useMemo, useState } from 'react'
import { fetchEvent } from '@common/features/Events/EventDao'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'

// A series is read by useMasterEvent, and an all-day event has no zone
function isSimpleTimedEvent(event: CalendarEvent): boolean {
  return !event.uid.includes('/') && !event.repetition?.freq && !event.allday
}

/**
 * The REPORT of the grid strips the zone of an event, which then holds the one
 * of the browser. Editing it from there would rewrite it in that zone, so the
 * edit form of a simple event reads the zone from the stored object, once per
 * opening. Opening the preview stays without a request (#1364).
 */
export function useStoredZone(
  event: CalendarEvent | null | undefined,
  open: boolean
): {
  eventInStoredZone: CalendarEvent | null | undefined
  isZonePending: boolean
} {
  // A timezone left undefined means the read failed: the form then starts from
  // what the grid knows
  const [read, setRead] = useState<{ uid: string; timezone?: string } | null>(
    null
  )
  const needsRead = open && !!event && isSimpleTimedEvent(event)
  const uid = event?.uid

  useEffect(() => {
    if (!needsRead || !event) {
      setRead(null)
      return
    }

    let cancelled = false
    const readZone = async (): Promise<void> => {
      try {
        const stored = parseFetchedEvent(event, await fetchEvent(event))
        if (!cancelled) setRead({ uid: event.uid, timezone: stored.timezone })
      } catch (err) {
        console.error('Failed to read the zone of the event:', err)
        if (!cancelled) setRead({ uid: event.uid })
      }
    }
    void readZone()

    return (): void => {
      cancelled = true
    }
    // Once per opening: the event object changes with every update of the store
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRead, uid])

  const eventInStoredZone = useMemo(
    () =>
      event && read?.uid === event.uid && read.timezone
        ? { ...event, timezone: read.timezone }
        : event,
    [event, read]
  )

  return {
    eventInStoredZone,
    isZonePending: needsRead && read?.uid !== uid
  }
}
