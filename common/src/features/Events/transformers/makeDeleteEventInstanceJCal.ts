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
import { incrementSequenceNumber } from './makeSeriesJCal'
import { filterComponents } from './parseFetchedEvent'
import { getTzidParam, sameRecurrence } from './recurrenceInstant'

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

  // EXDATE must use the same date-time form as the master DTSTART, otherwise the
  // CalDAV server rejects the update ("EXDATE date-time form (UTC) must match
  // DTSTART date-time form (TZID:...)"). When the series DTSTART carries a TZID we
  // therefore emit the EXDATE with that same TZID parameter and express the
  // occurrence as local wall-clock time in that zone instead of a bare UTC value.
  // See #1088.
  const dtstartProp = masterProps.find(([k]) => k.toLowerCase() === 'dtstart')
  const dtstartTzid = getTzidParam(dtstartProp?.[1])

  const valueType = seriesEvent.allday ? 'date' : 'date-time'
  const useTzidForm = !seriesEvent.allday && Boolean(dtstartTzid)
  const exdateParams: Record<string, string> = useTzidForm
    ? { tzid: dtstartTzid }
    : {}

  let exdateProperty = exdateValue as VObjectValue
  if (useTzidForm) {
    const zoned = moment.tz(exdateValue, dtstartTzid)
    exdateProperty = zoned.format('YYYY-MM-DDTHH:mm:ss') as VObjectValue
  }

  const isDuplicate = masterProps.some((prop: VObjectProperty) => {
    if (prop[0].toLowerCase() !== 'exdate' || !prop[3]) {
      return false
    }
    const existingTzid = getTzidParam(prop[1])
    return sameRecurrence(
      { value: prop[3], tzid: existingTzid },
      { value: exdateProperty, tzid: useTzidForm ? dtstartTzid : undefined },
      seriesEvent.timezone
    )
  })

  let updatedMasterProps = masterProps
  if (!isDuplicate) {
    // Add new EXDATE property as a separate entry
    updatedMasterProps = [
      ...masterProps,
      ['exdate', exdateParams, valueType, exdateProperty]
    ]
  }

  // Remove the override instance if it exists (in case it was an override being
  // deleted). Match by instant so an override stored in TZID/UTC form is still
  // recognised against the deleted occurrence expressed in another form.
  const filteredVevents = vevents.filter(([, props]) => {
    const recurrenceIdProp = (props as VObjectProperty[]).find(
      ([k]) => k.toLowerCase() === 'recurrence-id'
    )
    if (!recurrenceIdProp) return true // Keep master
    const overrideTzid = getTzidParam(recurrenceIdProp[1])
    return !sameRecurrence(
      { value: recurrenceIdProp[3], tzid: overrideTzid },
      { value: exdateValue },
      seriesEvent.timezone
    ) // Remove matching override
  })

  // This is an organizer-side change to the recurring master, so the CUA must
  // manage SEQUENCE (the CalDAV server stores the data as-is). Bump it whenever
  // the master effectively changed: a fresh EXDATE was added, or a matching
  // override VEVENT was removed. A duplicate EXDATE with no override removal is
  // a no-op and must not increment. See #1217.
  const overrideRemoved = filteredVevents.length < vevents.length
  if (!isDuplicate || overrideRemoved) {
    updatedMasterProps = incrementSequenceNumber(updatedMasterProps)
  }

  // Update the master VEVENT with the new properties
  vevents[masterIndex][1] = updatedMasterProps

  // Build the updated jCal with all VEVENTs and timezone
  const timezoneData = TIMEZONES.zones[seriesEvent.timezone]
  const vtimezone = makeTimezone(timezoneData, seriesEvent)

  return [
    'vcalendar',
    VcalendarProperties,
    [...filteredVevents, vtimezone.component.jCal as VCalComponent]
  ]
}
