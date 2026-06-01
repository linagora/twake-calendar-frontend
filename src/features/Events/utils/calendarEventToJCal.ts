import { TIMEZONES } from '@/utils/timezone-data'
import { CalendarEvent } from '../EventsTypes'
import { makeVevent } from './makeVevent'
import { makeTimezone } from './makeTimezone'
import { VcalendarProperties } from '@/features/Calendars/types/VcalendarProperties'

export function calendarEventToJCal(
  event: CalendarEvent,
  calOwnerEmail?: string
) {
  const tzid = event.timezone

  const vevent = makeVevent(event, tzid, calOwnerEmail)

  const timezoneData = TIMEZONES.zones[event.timezone]
  const vtimezone = makeTimezone(timezoneData, event)

  return ['vcalendar', VcalendarProperties, [vevent, vtimezone.component.jCal]]
}
