import { TIMEZONES } from '@/utils/timezone-data'
import {
  VCalComponent,
  VObjectProperty
} from '../../Calendars/types/CalendarData'
import { CalendarEvent } from '../EventsTypes'
import { makeTimezone } from '../utils'

export function updateSeriesPartstatJCal(
  vevents: VCalComponent[],
  event: CalendarEvent,
  attendeeEmail: string,
  partstat: string
): VCalComponent {
  // Update PARTSTAT in ALL VEVENTs (master + exceptions)
  const updatedVevents = vevents.map((vevent: VCalComponent) => {
    const properties = vevent[1] as VObjectProperty[]
    const updatedProperties = properties.map((prop: VObjectProperty) => {
      const calAddress = prop[3] as string
      // Find ATTENDEE properties & Check if this is the target attendee
      if (
        prop[0] === 'attendee' &&
        calAddress.toLowerCase().includes(attendeeEmail.toLowerCase())
      ) {
        // Update PARTSTAT parameter
        const params = { ...(prop[1] as Record<string, string>), partstat }
        return [prop[0], params, prop[2], prop[3]] as VObjectProperty
      }
      return prop
    })
    return [vevent[0], updatedProperties, vevent[2]] as VCalComponent
  })

  const timezoneData = TIMEZONES.zones[event.timezone]
  const vtimezone = makeTimezone(timezoneData, event)

  return ['vcalendar', [], [...updatedVevents, vtimezone.component.jCal]]
}
