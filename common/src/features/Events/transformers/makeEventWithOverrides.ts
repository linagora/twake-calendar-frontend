import { findTimezoneData } from '@common/utils/timezoneLookup'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeTimezone, makeVevent } from '@common/features/Events/utils'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'
import { getTzidParam, sameRecurrence } from './recurrenceInstant'

export function makeEventWithOverrides(
  updatedEvent: CalendarEvent,
  vevents: VCalComponent[]
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

  const timezoneData = findTimezoneData(updatedEvent.timezone)
  const vtimezone = makeTimezone(timezoneData, updatedEvent)

  return [
    'vcalendar',
    VcalendarProperties,
    [...nextVevents, vtimezone.component.jCal as VCalComponent]
  ]
}

function findRecurrenceId(vevent: VCalComponent): VObjectProperty | undefined {
  return vevent[1].find(([k]) => k.toLowerCase() === 'recurrence-id')
}

// A tz-naive in-memory recurrenceId is the stored RECURRENCE-ID value with its
// TZID dropped by the parser: the stored value it equals is that override,
// whatever zone the event is written in after the edit. Reading it in the zone
// of the edited event (the DTSTART zone of a moved override, or the zone picked
// in the form) designates another instant and missed the override. See #1882.
function findOverrideIndex(
  vevents: VCalComponent[],
  updatedEvent: CalendarEvent
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
  return storedIds.findIndex(
    storedId =>
      storedId &&
      sameRecurrence(
        { value: storedId[3], tzid: getTzidParam(storedId[1]) },
        { value: id },
        updatedEvent.timezone
      )
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
