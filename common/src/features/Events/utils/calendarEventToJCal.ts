import { findTimezoneData } from '@common/utils/timezoneLookup'
import { resolveTimezone } from '@common/utils/timezone'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeVevent } from './makeVevent'
import { makeTimezone } from './makeTimezone'
import { referencedVtimezones } from '@common/features/Events/transformers/seriesVtimezones'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'

/**
 * RFC 5545 3.2.19: each TZID written needs its VTIMEZONE. The dates are written
 * in the zone of the table the event zone stands for, and in UTC (next to the
 * Etc/UTC VTIMEZONE of makeTimezone) when the table has none, Etc/GMT-14 for
 * example, rather than under a TZID the object leaves undefined. The other
 * TZIDs, of properties the model does not hold, get theirs from the table or
 * the stored object (#2178).
 */
export function calendarEventToJCal(event: CalendarEvent) {
  const resolved = event.timezone ? resolveTimezone(event.timezone) : undefined
  const timezoneData = resolved ? findTimezoneData(resolved) : undefined
  const tzid = timezoneData ? resolved : undefined

  const vevent = makeVevent(event, tzid)
  const ownTzid = tzid ?? 'Etc/UTC'
  const vtimezone = makeTimezone(timezoneData, { ...event, timezone: ownTzid })

  const otherVtimezones = referencedVtimezones(
    [vevent as VCalComponent],
    event.storedVtimezones ?? [],
    [ownTzid]
  )

  return [
    'vcalendar',
    VcalendarProperties,
    [vevent, vtimezone.component.jCal, ...otherVtimezones]
  ]
}
