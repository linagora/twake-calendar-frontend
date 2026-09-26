import { useMemo } from 'react'
import type { Resource } from './ResourceSearch'
import { FreeBusyMap, useAttendeesFreeBusy } from './useFreeBusy'

export const resourceKey = (resource: Resource): string =>
  resource.email ?? resource.displayName

// A resource calendar lives under the resource id, which is also the local
// part of its email: resources read back from an event only carry the latter.
function resourceCalendarId(resource: Resource): string | null {
  if (resource.openpaasId) return resource.openpaasId
  const localPart = resource.email?.replace(/^mailto:/i, '').split('@')[0]
  return localPart || null
}

interface UseResourcesFreeBusyOptions {
  resources: Resource[]
  start?: string
  end?: string
  timezone?: string
  eventUid?: string | null
}

/**
 * Availability of the resources booked on an event, keyed by resourceKey.
 *
 * When editing, every resource is looked up while ignoring the event itself,
 * so that a room it already books is not reported busy because of it.
 */
export function useResourcesFreeBusy({
  resources,
  start,
  end,
  timezone,
  eventUid
}: UseResourcesFreeBusyOptions): FreeBusyMap {
  const attendees = useMemo(
    () =>
      resources.map(resource => ({
        email: resourceKey(resource),
        userId: resourceCalendarId(resource)
      })),
    [resources]
  )

  return useAttendeesFreeBusy({
    existingAttendees: eventUid ? attendees : [],
    newAttendees: eventUid ? [] : attendees,
    start: start ?? '',
    end: end ?? '',
    timezone: timezone ?? '',
    eventUid,
    enabled: !!(start && end && resources.length > 0)
  })
}
