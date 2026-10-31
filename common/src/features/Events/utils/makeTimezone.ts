import { findTimezoneData, TimezoneData } from '@common/utils/timezone-data'
import ICAL from 'ical.js'
import { CalendarEvent } from '@common/types/EventsTypes'

export function makeTimezone(
  timezoneData: TimezoneData | undefined,
  event: CalendarEvent
): ICAL.Timezone {
  if (typeof timezoneData?.ics !== 'string') {
    const utcIcs = findTimezoneData('Etc/UTC')?.ics
    if (!utcIcs) {
      throw new Error('Missing timezone ICS for Etc/UTC')
    }
    const component = new ICAL.Component(ICAL.parse(utcIcs))
    return new ICAL.Timezone({ component, tzid: 'Etc/UTC' })
  }
  const component = new ICAL.Component(ICAL.parse(timezoneData.ics))
  return new ICAL.Timezone({ component, tzid: event.timezone })
}
