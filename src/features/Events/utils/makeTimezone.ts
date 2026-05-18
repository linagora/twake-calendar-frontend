import { TIMEZONES } from '@/utils/timezone-data'
import ICAL from 'ical.js'
import { CalendarEvent } from '../EventsTypes'

export function makeTimezone(
  timezoneData:
    | { ics: string; latitude: string; longitude: string }
    | undefined,
  event: CalendarEvent
): ICAL.Timezone {
  if (!timezoneData) {
    const utcIcs = TIMEZONES.zones['Etc/UTC']?.ics
    if (!utcIcs) {
      throw new Error('Missing timezone ICS for Etc/UTC')
    }
    const component = new ICAL.Component(ICAL.parse(utcIcs))
    return new ICAL.Timezone({ component, tzid: 'Etc/UTC' })
  }
  const component = new ICAL.Component(ICAL.parse(timezoneData.ics))
  return new ICAL.Timezone({ component, tzid: event.timezone })
}
