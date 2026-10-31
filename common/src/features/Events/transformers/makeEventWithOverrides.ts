import { TIMEZONES } from '@common/utils/timezone-data'
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
  let replaced = false
  for (let i = 0; i < nextVevents.length; i++) {
    const ve = nextVevents[i]
    const recurrenceId = ve[1].find(
      ([k]) => k.toLowerCase() === 'recurrence-id'
    )
    const storedTzid = getTzidParam(recurrenceId?.[1])
    if (
      recurrenceId &&
      updatedEvent.recurrenceId &&
      sameRecurrence(
        { value: recurrenceId[3], tzid: storedTzid },
        { value: updatedEvent.recurrenceId },
        updatedEvent.timezone
      )
    ) {
      // Preserve the stored RECURRENCE-ID tuple (its TZID parameter and exact
      // wall-clock form) on the regenerated VEVENT. makeVevent re-derives the
      // RECURRENCE-ID through `new Date()`, which parses the tz-naive string as
      // browser-local time and can shift it into another form. Emitting that
      // shifted id alongside the original one made the server reject the update
      // with "Duplicate RECURRENCE-ID". RECURRENCE-ID identifies the original
      // occurrence and must never change on an instance edit. See #1088.
      preserveRecurrenceId(updatedVevent, recurrenceId)
      nextVevents[i] = updatedVevent as VCalComponent // replace
      replaced = true
      break
    }
  }
  if (!replaced && updatedEvent.recurrenceId) {
    nextVevents.push(updatedVevent as VCalComponent)
  }

  // A VTIMEZONE for each TZID of the series, not only the edited zone. See #1881.
  const vtimezones = makeSeriesVtimezones(
    nextVevents,
    storedVtimezones,
    () =>
      makeTimezone(TIMEZONES.zones[updatedEvent.timezone], updatedEvent)
        .component.jCal as VCalComponent
  )

  return ['vcalendar', VcalendarProperties, [...nextVevents, ...vtimezones]]
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
