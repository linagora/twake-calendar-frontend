import { TIMEZONES } from '@common/utils/timezone-data'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeTimezone, makeVevent } from '@common/features/Events/utils'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'

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
  let replaced = false
  for (let i = 0; i < nextVevents.length; i++) {
    const ve = nextVevents[i]
    const recurrenceId = (ve[1] as VObjectProperty[]).find(
      ([k]) => k === 'recurrence-id'
    )
    if (
      recurrenceId &&
      normalizeId(recurrenceId[3]) === normalizeId(updatedEvent.recurrenceId)
    ) {
      nextVevents[i] = updatedVevent as VCalComponent // replace
      replaced = true
      break
    }
  }
  if (!replaced && updatedEvent.recurrenceId) {
    nextVevents.push(updatedVevent as VCalComponent)
  }

  const timezoneData = TIMEZONES.zones[updatedEvent.timezone]
  const vtimezone = makeTimezone(timezoneData, updatedEvent)

  return [
    'vcalendar',
    VcalendarProperties,
    [...nextVevents, vtimezone.component.jCal as VCalComponent]
  ]
}

const normalizeId = (id: unknown): string =>
  ((id ?? '') as string).replace(/Z$/, '')
