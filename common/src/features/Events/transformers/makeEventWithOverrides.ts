import { findTimezoneData } from '@common/utils/timezoneLookup'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  formatDateTimeToICal,
  makeTimezone,
  makeVevent
} from '@common/features/Events/utils'
import {
  isMomentZone,
  readWallClock,
  resolveTimezone,
  storedTimezone,
  withStoredTimezones
} from '@common/utils/timezone'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'
import {
  getTzidParam,
  recurrenceInstant,
  sameRecurrence
} from './recurrenceInstant'
import { makeSeriesVtimezones, vtimezoneLocation } from './seriesVtimezones'

export function makeEventWithOverrides(
  updatedEvent: CalendarEvent,
  vevents: VCalComponent[],
  storedVtimezones: VCalComponent[] = []
): VCalComponent {
  const updatedVevent = makeVevent(
    updatedEvent,
    updatedEvent.timezone,
    !updatedEvent.recurrenceId
  )
  const nextVevents = [...vevents]
  const overrideIndex = withStoredTimezones(storedVtimezones, () =>
    findOverrideIndex(nextVevents, updatedEvent, storedVtimezones)
  )
  if (overrideIndex !== -1) {
    // Preserve the stored RECURRENCE-ID tuple (its TZID parameter and exact
    // wall-clock form) on the regenerated VEVENT. makeVevent re-derives the
    // RECURRENCE-ID through `new Date()`, which parses the tz-naive string as
    // browser-local time and can shift it into another form. Emitting that
    // shifted id alongside the original one made the server reject the update
    // with "Duplicate RECURRENCE-ID". RECURRENCE-ID identifies the original
    // occurrence and must never change on an instance edit. See #1088.
    preserveRecurrenceId(
      updatedVevent,
      findRecurrenceId(nextVevents[overrideIndex]) as VObjectProperty
    )
    nextVevents[overrideIndex] = updatedVevent as VCalComponent // replace
  } else if (updatedEvent.recurrenceId) {
    const recurrenceId = newOverrideRecurrenceId(updatedEvent, nextVevents)
    if (recurrenceId) {
      preserveRecurrenceId(updatedVevent, recurrenceId)
    }
    nextVevents.push(updatedVevent as VCalComponent)
  }

  // A VTIMEZONE for each TZID of the series, not only the edited zone. See #1881.
  const vtimezones = makeSeriesVtimezones(
    nextVevents,
    storedVtimezones,
    () =>
      makeTimezone(findTimezoneData(updatedEvent.timezone), updatedEvent)
        .component.jCal as VCalComponent
  )

  return ['vcalendar', VcalendarProperties, [...nextVevents, ...vtimezones]]
}

function findRecurrenceId(vevent: VCalComponent): VObjectProperty | undefined {
  return vevent[1].find(([k]) => k.toLowerCase() === 'recurrence-id')
}

// A tz-naive in-memory recurrenceId is the stored RECURRENCE-ID value with its
// TZID dropped by the parser: the stored value it equals is that override,
// whatever zone the event is written in after the edit. Reading it in the zone
// of the edited event (the DTSTART zone of a moved override, or the zone picked
// in the form) designates another instant and missed the override. See #1882.
// Several overrides written by clients in other zones can share that wall-clock
// value under different TZIDs: the one read in the zone of the event is the
// edited occurrence, not the first one. See #1939.
// A custom TZID is read with its stored observances, or the IANA location it
// names. Without either, a fallback zone is only a last resort. See #1977.
function findOverrideIndex(
  vevents: VCalComponent[],
  updatedEvent: CalendarEvent,
  storedVtimezones: VCalComponent[]
): number {
  const id = updatedEvent.recurrenceId
  if (!id) {
    return -1
  }
  const storedIds = vevents.map(findRecurrenceId)
  const isCertain = (storedId: VObjectProperty | undefined): boolean =>
    storedId !== undefined && hasCertainInstant(storedId, storedVtimezones)
  const isSameInstant =
    (zone: string | undefined) =>
    (storedId: VObjectProperty | undefined): boolean => {
      if (!storedId) return false
      const tzid = storedTzid(storedId, storedVtimezones)
      const raw = storedId[3]
      // A custom TZID without an IANA location still has a definite instant
      // when its stored VTIMEZONE supplies the offset. Do not read its wall
      // clock in the fallback zone: that can select a different override.
      const value =
        typeof raw === 'string' &&
        tzid &&
        storedTimezone(tzid) &&
        !/Z$/.test(raw)
          ? readWallClock(raw, tzid).toISOString()
          : raw
      return sameRecurrence({ value, tzid }, { value: id }, zone)
    }
  const exactIndexes = /Z$/.test(id)
    ? []
    : storedIds.flatMap((storedId, index) =>
        storedId?.[3] === id ? [index] : []
      )
  if (exactIndexes.length === 1) {
    return exactIndexes[0]
  }
  if (exactIndexes.length > 1) {
    // A TZID the fallback zone only reads matches any wall clock: prefer the
    // candidates with a definite instant. See #2034.
    const inEventZone = isSameInstant(updatedEvent.timezone)
    const index = preferCertain(
      exactIndexes,
      index => inEventZone(storedIds[index]),
      index => isCertain(storedIds[index])
    )
    return index ?? exactIndexes[0]
  }
  // A stored value without TZID is read in the zone of the series (#1938)
  const inSeriesZone = isSameInstant(
    seriesZone(vevents) ?? updatedEvent.timezone
  )
  return (
    preferCertain(
      storedIds.map((_, index) => index),
      index => inSeriesZone(storedIds[index]),
      index => isCertain(storedIds[index])
    ) ?? -1
  )
}

// The first matching index with a definite instant, else the first matching one
function preferCertain(
  indexes: number[],
  matches: (index: number) => boolean,
  isCertain: (index: number) => boolean
): number | undefined {
  return (
    indexes.find(index => isCertain(index) && matches(index)) ??
    indexes.find(matches)
  )
}

// The TZID to read a stored value in: prefer the IANA location of an unknown
// TZID, otherwise keep its name so the stored VTIMEZONE can supply its rules.
function storedTzid(
  storedId: VObjectProperty,
  storedVtimezones: VCalComponent[]
): string | undefined {
  const tzid = getTzidParam(storedId[1])
  if (!tzid || isMomentZone(resolveTimezone(tzid))) {
    return tzid
  }
  return vtimezoneLocation(tzid, storedVtimezones) ?? tzid
}

function hasCertainInstant(
  storedId: VObjectProperty,
  storedVtimezones: VCalComponent[]
): boolean {
  const tzid = storedTzid(storedId, storedVtimezones)
  return (
    (typeof storedId[3] === 'string' && /Z$/.test(storedId[3])) ||
    !tzid ||
    Boolean(storedTimezone(tzid)) ||
    isMomentZone(resolveTimezone(tzid))
  )
}

// The RECURRENCE-ID of a new override designates the original occurrence and
// does not follow the zone picked in the form: written as a wall clock of that
// zone, an occurrence in the hour repeated at the end of summer time designated
// the other instant. A UTC in-memory id is written in the zone of the series
// (the wall clock the server expanded), else in UTC. See #1945.
function newOverrideRecurrenceId(
  updatedEvent: CalendarEvent,
  vevents: VCalComponent[]
): VObjectProperty | undefined {
  const id = updatedEvent.recurrenceId
  if (updatedEvent.allday || !id || !/Z$/.test(id)) {
    return undefined
  }
  const instant = new Date(id)
  if (Number.isNaN(instant.getTime())) {
    return undefined
  }
  const tzid = getTzidParam(findMasterDtstart(vevents)?.[1])
  const zone = tzid ? resolveTimezone(tzid) : undefined
  if (tzid && isMomentZone(zone)) {
    const wallClock = formatDateTimeToICal(instant, zone)
    // The wall clock must read back as the occurrence: an ambiguous one is
    // its first occurrence (RFC 5545, 3.3.5)
    if (recurrenceInstant(wallClock, zone) === instant.getTime()) {
      return ['recurrence-id', { tzid }, 'date-time', wallClock]
    }
  }
  return ['recurrence-id', {}, 'date-time', formatDateTimeToICal(instant)]
}

function findMasterDtstart(
  vevents: VCalComponent[]
): VObjectProperty | undefined {
  const master = vevents.find(vevent => !findRecurrenceId(vevent))
  return master?.[1].find(([k]) => k.toLowerCase() === 'dtstart')
}

// The zone a stored value without TZID is read in: the zone of the series, not
// the zone picked in the form, which an edit may have changed. A floating
// master is expanded in UTC by the server. See #1938.
function seriesZone(vevents: VCalComponent[]): string | undefined {
  const master = vevents.find(vevent => !findRecurrenceId(vevent))
  if (!master) {
    return undefined
  }
  const dtstart = master[1].find(([k]) => k.toLowerCase() === 'dtstart')
  return getTzidParam(dtstart?.[1]) ?? 'UTC'
}

function preserveRecurrenceId(
  vevent: [string, unknown[]],
  storedRecurrenceId: VObjectProperty
): void {
  const props = vevent[1] as VObjectProperty[]
  const index = props.findIndex(([k]) => k.toLowerCase() === 'recurrence-id')
  if (index !== -1) {
    props[index] = storedRecurrenceId
  }
}
