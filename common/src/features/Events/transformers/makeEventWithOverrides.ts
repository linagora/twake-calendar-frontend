import { findTimezoneData } from '@common/utils/timezoneLookup'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeTimezone, makeVevent } from '@common/features/Events/utils'
import { isMomentZone, resolveTimezone } from '@common/utils/timezone'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'
import { getTzidParam, sameRecurrence } from './recurrenceInstant'
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
  const overrideIndex = findOverrideIndex(
    nextVevents,
    updatedEvent,
    storedVtimezones
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
// A TZID only its VTIMEZONE defines is read in the zone it names. Without one,
// reading the value in a fallback zone is a guess: it only applies when no
// override designates the instant for certain. See #1977.
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
  const exactIndex = /Z$/.test(id)
    ? -1
    : storedIds.findIndex(storedId => storedId?.[3] === id)
  if (exactIndex !== -1) {
    return exactIndex
  }
  const isSameInstant = (storedId: VObjectProperty | undefined): boolean =>
    storedId !== undefined &&
    sameRecurrence(
      { value: storedId[3], tzid: storedTzid(storedId, storedVtimezones) },
      { value: id },
      updatedEvent.timezone
    )
  const certainIndex = storedIds.findIndex(
    storedId =>
      storedId &&
      hasCertainInstant(storedId, storedVtimezones) &&
      isSameInstant(storedId)
  )
  return certainIndex !== -1 ? certainIndex : storedIds.findIndex(isSameInstant)
}

// The TZID to read a stored value in: the zone a VTIMEZONE names for a TZID
// moment-timezone does not know
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
    /Z$/.test(String(storedId[3])) ||
    !tzid ||
    isMomentZone(resolveTimezone(tzid))
  )
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
