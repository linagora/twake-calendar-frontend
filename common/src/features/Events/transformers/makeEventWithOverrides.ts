import { findTimezoneData } from '@common/utils/timezoneLookup'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeTimezone, makeVevent } from '@common/features/Events/utils'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'
import { getTzidParam, sameRecurrence } from './recurrenceInstant'
import { makeSeriesVtimezones } from './seriesVtimezones'

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
  const overrideIndex = findOverrideIndex(nextVevents, updatedEvent)
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
// Several overrides written by clients in other zones can share that wall-clock
// value under different TZIDs: the one read in the zone of the event is the
// edited occurrence, not the first one. See #1939.
function findOverrideIndex(
  vevents: VCalComponent[],
  updatedEvent: CalendarEvent
): number {
  const id = updatedEvent.recurrenceId
  if (!id) {
    return -1
  }
  const storedIds = vevents.map(findRecurrenceId)
  const isSameInstant = (storedId: VObjectProperty | undefined): boolean =>
    storedId !== undefined &&
    sameRecurrence(
      { value: storedId[3], tzid: getTzidParam(storedId[1]) },
      { value: id },
      updatedEvent.timezone
    )
  const exactIndexes = /Z$/.test(id)
    ? []
    : storedIds.flatMap((storedId, index) =>
        storedId?.[3] === id ? [index] : []
      )
  if (exactIndexes.length === 1) {
    return exactIndexes[0]
  }
  if (exactIndexes.length > 1) {
    return (
      exactIndexes.find(index => isSameInstant(storedIds[index])) ??
      exactIndexes[0]
    )
  }
  return storedIds.findIndex(isSameInstant)
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
