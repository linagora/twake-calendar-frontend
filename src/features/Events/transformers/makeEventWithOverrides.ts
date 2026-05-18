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
    [],
    [...nextVevents, vtimezone.component.jCal as VCalComponent]
  ]
}

const normalizeId = (id: unknown): string => String(id ?? '').replace(/Z$/, '')
