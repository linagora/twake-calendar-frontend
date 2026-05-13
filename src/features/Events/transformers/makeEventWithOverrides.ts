import { TIMEZONES } from '@/utils/timezone-data'
import {
  VCalComponent,
  VObjectProperty
} from '../../Calendars/types/CalendarData'
import { CalendarEvent } from '../EventsTypes'
import { makeTimezone, makeVevent } from '../utils'

export function makeEventWithOverrides(
  updatedEvent: CalendarEvent,
  vevents: VCalComponent[],
  calOwnerEmail?: string
): VCalComponent {
  const updatedVevent = makeVevent(
    updatedEvent,
    updatedEvent.timezone,
    calOwnerEmail,
    !updatedEvent.recurrenceId
  )
  let replaced = false
  for (let i = 0; i < vevents.length; i++) {
    const ve = vevents[i]
    const recurrenceId = (ve[1] as VObjectProperty[]).find(
      ([k]) => k === 'recurrence-id'
    )
    if (recurrenceId && recurrenceId[3] === updatedEvent.recurrenceId) {
      vevents[i] = updatedVevent as VCalComponent // replace
      replaced = true
      break
    }
  }
  if (!replaced && updatedEvent.recurrenceId) {
    vevents.push(updatedVevent as VCalComponent) // add new override
  }

  const timezoneData = TIMEZONES.zones[updatedEvent.timezone]
  const vtimezone = makeTimezone(timezoneData, updatedEvent)

  return ['vcalendar', [], [...vevents, vtimezone.component.jCal]]
}
