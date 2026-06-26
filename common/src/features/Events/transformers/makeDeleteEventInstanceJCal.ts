import { TIMEZONES } from '@common/utils/timezone-data'
import moment from 'moment-timezone'
import { Calendar } from '@common/types/CalendarTypes'
import {
  VCalComponent,
  VObjectProperty,
  VObjectValue
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeTimezone, parseCalendarEvent } from '@common/features/Events/utils'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'

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
    eventURL: ''
  })
  const masterProps = vevents[masterIndex][1] as VObjectProperty[]

  // EXDATE must use the same date-time form as the master DTSTART, otherwise the
  // CalDAV server rejects the update ("EXDATE date-time form (UTC) must match
  // DTSTART date-time form (TZID:...)"). When the series DTSTART carries a TZID we
  // therefore emit the EXDATE with that same TZID parameter and express the
  // occurrence as local wall-clock time in that zone instead of a bare UTC value.
  // See #1088.
  const dtstartProp = masterProps.find(([k]) => k.toLowerCase() === 'dtstart')
  const dtstartTzid = (
    (dtstartProp?.[1] as Record<string, string> | undefined) ?? {}
  ).tzid

  const valueType = seriesEvent.allday ? 'date' : 'date-time'
  const useTzidForm = !seriesEvent.allday && Boolean(dtstartTzid)
  const exdateParams: Record<string, string> = useTzidForm
    ? { tzid: dtstartTzid as string }
    : {}
  const exdateProperty: VObjectValue = useTzidForm
    ? (moment
        .tz(exdateValue, seriesEvent.timezone)
        .format('YYYY-MM-DDTHH:mm:ss') as VObjectValue)
    : (exdateValue as VObjectValue)

  const isDuplicate = masterProps.some((prop: VObjectProperty) => {
    return (
      prop[0].toLowerCase() === 'exdate' &&
      prop[3] &&
      normalizeRecurrenceId(prop[3]) === normalizeRecurrenceId(exdateProperty)
    )
  })

  if (!isDuplicate) {
    // Add new EXDATE property as a separate entry
    masterProps.push(['exdate', exdateParams, valueType, exdateProperty])
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
