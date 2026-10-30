import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { resolveTimezone } from '@common/utils/timezone'
import { TIMEZONES } from '@common/utils/timezone-data'
import ICAL from 'ical.js'
import { getTzidParam } from './recurrenceInstant'

function collectTzids(component: VCalComponent, tzids: Set<string>): void {
  const [, props, subComponents = []] = component
  props
    .map(([, params]) => getTzidParam(params))
    .filter((tzid): tzid is string => Boolean(tzid))
    .forEach(tzid => tzids.add(tzid))
  subComponents.forEach(sub => collectTzids(sub, tzids))
}

function usedTzids(vevents: VCalComponent[]): Set<string> {
  const tzids = new Set<string>()
  vevents.forEach(vevent => collectTzids(vevent, tzids))
  return tzids
}

function tzidOf([, props]: VCalComponent): string | undefined {
  const tzid = props.find(([k]) => k.toLowerCase() === 'tzid')?.[3]
  return typeof tzid === 'string' && tzid ? tzid : undefined
}

/**
 * The VTIMEZONE of a known zone (IANA name, alias or Windows name), carrying
 * the exact TZID the properties reference: `US/Central` gets the
 * `America/Chicago` rules under `TZID:US/Central`.
 */
function knownVtimezone(tzid: string): VCalComponent | undefined {
  const timezoneData = TIMEZONES.zones[resolveTimezone(tzid)]
  if (!timezoneData) {
    return undefined
  }
  const component = new ICAL.Component(
    ICAL.parse(timezoneData.ics) as unknown[]
  )
  component.updatePropertyWithValue('tzid', tzid)
  return component.toJSON() as VCalComponent
}

/**
 * The VTIMEZONE components a series write must carry: one per TZID its VEVENTs
 * reference (RFC 5545 §3.6.5). The VTIMEZONEs of the stored object are kept as
 * they were, so custom and unknown zones keep their definition; the missing
 * ones come from the known zones. `fallback` is used when no TZID could be
 * covered (floating, UTC or all-day series).
 */
export function makeSeriesVtimezones(
  vevents: VCalComponent[],
  storedVtimezones: VCalComponent[],
  fallback: () => VCalComponent
): VCalComponent[] {
  const storedByTzid = new Map(
    storedVtimezones
      .map(vtimezone => [tzidOf(vtimezone), vtimezone] as const)
      .filter((entry): entry is [string, VCalComponent] => Boolean(entry[0]))
  )
  const vtimezones = [...usedTzids(vevents)]
    .map(tzid => storedByTzid.get(tzid) ?? knownVtimezone(tzid))
    .filter((vtimezone): vtimezone is VCalComponent => Boolean(vtimezone))
  return vtimezones.length > 0 ? vtimezones : [fallback()]
}
