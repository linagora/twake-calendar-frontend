import { useEffect, useMemo, useState } from 'react'
import { fetchEvent } from '@common/features/Events/EventDao'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'

// A series is read by useMasterEvent, and an all-day event has no zone
function isSimpleTimedEvent(event: CalendarEvent): boolean {
  return !event.uid.includes('/') && !event.repetition?.freq && !event.allday
}

function getZoneTarget(
  event: CalendarEvent | null | undefined,
  open: boolean
): CalendarEvent | null {
  return open && event && isSimpleTimedEvent(event) ? event : null
}

type StoredZoneRead = { uid: string; timezone?: string }

async function readStoredZone(event: CalendarEvent): Promise<StoredZoneRead> {
  try {
    const stored = parseFetchedEvent(event, await fetchEvent(event))
    return { uid: event.uid, timezone: stored.timezone }
  } catch (err) {
    console.error('Failed to read the zone of the event:', err)
    return { uid: event.uid }
  }
}

function applyStoredZone(
  event: CalendarEvent | null | undefined,
  read: StoredZoneRead | null
): CalendarEvent | null | undefined {
  if (!event || read?.uid !== event.uid || !read.timezone) return event
  return { ...event, timezone: read.timezone }
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
  const [read, setRead] = useState<StoredZoneRead | null>(null)
  const target = getZoneTarget(event, open)
  const targetUid = target?.uid

  useEffect(() => {
    if (!target) {
      setRead(null)
      return
    }

    let cancelled = false
    const readZone = async (): Promise<void> => {
      const result = await readStoredZone(target)
      if (!cancelled) setRead(result)
    }
    void readZone()

    return (): void => {
      cancelled = true
    }
    // Once per opening: the event object changes with every update of the store
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUid])

  const eventInStoredZone = useMemo(
    () => applyStoredZone(event, read),
    [event, read]
  )

  return {
    eventInStoredZone,
    isZonePending: Boolean(targetUid && read?.uid !== targetUid)
  }
}
