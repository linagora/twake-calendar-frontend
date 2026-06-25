import {
  VCalComponent,
  VObjectProperty,
  VObjectValue
} from '@common/features/Calendars/types/CalendarData'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'
import { makeTimezone, parseCalendarEvent } from '@common/features/Events/utils'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { TIMEZONES } from '@common/utils/timezone-data'
import moment from 'moment-timezone'
import { filterComponents } from './parseFetchedEvent'

export function makeDeleteEventInstanceJCal(
  vevents: VCalComponent[],
  event: CalendarEvent
): VCalComponent {
  // Find the master VEVENT
  const masterIndex = vevents.findIndex(
    ([, props]) =>
      !(props as VObjectProperty[]).find(
        ([k]) => k.toLowerCase() === 'recurrence-id'
      )
  )

  if (masterIndex === -1) {
    throw new Error('No master VEVENT found for this series')
  }

  const exdateValue = event.recurrenceId ?? event.start
  const seriesEvent = parseCalendarEvent({
    data: vevents[masterIndex][1] as VObjectProperty[],
    color: {},
    calendar: { id: event.calId } as Calendar,
    eventURL: '',
    valarms: filterComponents(vevents[masterIndex], 'valarm')
  })
  const masterProps = vevents[masterIndex][1] as VObjectProperty[]

  const isDuplicate = masterProps.some((prop: VObjectProperty) => {
    return (
      prop[0].toLowerCase() === 'exdate' &&
      prop[3] &&
      normalizeRecurrenceId(prop[3]) ===
        normalizeRecurrenceId(exdateValue as VObjectValue)
    )
  })

  if (!isDuplicate) {
    // Add new EXDATE property as a separate entry
    const valueType = seriesEvent.allday ? 'date' : 'date-time'
    masterProps.push(['exdate', {}, valueType, exdateValue])
  }

  // Update the master VEVENT with the new properties
  vevents[masterIndex][1] = masterProps

  // Remove the override instance if it exists (in case it was an override being deleted)
  const filteredVevents = vevents.filter(([, props]) => {
    const recurrenceIdProp = (props as VObjectProperty[]).find(
      ([k]) => k.toLowerCase() === 'recurrence-id'
    )
    if (!recurrenceIdProp) return true // Keep master
    return (
      normalizeRecurrenceId(recurrenceIdProp[3]) !==
      normalizeRecurrenceId(
        moment
          .tz(exdateValue, seriesEvent.timezone)
          .format('YYYY-MM-DDTHH:mm:ss') as VObjectValue
      )
    ) // Remove matching override
  })

  // Build the updated jCal with all VEVENTs and timezone
  const timezoneData = TIMEZONES.zones[seriesEvent.timezone]
  const vtimezone = makeTimezone(timezoneData, seriesEvent)

  return [
    'vcalendar',
    VcalendarProperties,
    [...filteredVevents, vtimezone.component.jCal as VCalComponent]
  ]
}

const normalizeRecurrenceId = (id: VObjectValue): string =>
  (typeof id === 'string' || typeof id === 'number' ? String(id) : '').replace(
    /Z$/,
    ''
  )
