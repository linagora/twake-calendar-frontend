import { convertEventDateTimeToISO, resolveTimezoneId } from '@/utils/timezone'
import ICAL from 'ical.js'
import { Calendar } from '../../Calendars/CalendarTypes'
import {
  VCalComponent,
  VObjectProperty
} from '../../Calendars/types/CalendarData'
import { CalendarEvent } from '../EventsTypes'
import { parseCalendarEvent } from '../utils'

export function parseFetchedEvent(
  event: CalendarEvent,
  eventData: string,
  isMaster?: boolean
): CalendarEvent {
  const eventical = ICAL.parse(eventData) as VCalComponent
  const vevents = (eventical[2] ?? []).filter(
    ([name]) => name.toLowerCase() === 'vevent'
  )
  const vtimezones = (eventical[2] ?? []).filter(
    ([name]) => name.toLowerCase() === 'vtimezone'
  )

  let targetVevent: VCalComponent | undefined
  if (isMaster) {
    targetVevent = vevents.find(
      ([, props]) =>
        !(props as VObjectProperty[]).find(
          ([k]) => k.toLowerCase() === 'recurrence-id'
        )
    )
    if (!targetVevent) {
      targetVevent = vevents[0]
    }
  } else {
    targetVevent = vevents[0]
  }

  let timezoneFromVTimezone: string | undefined
  if (vtimezones.length > 0) {
    const vtimezone = vtimezones[0]
    const tzidProp = (vtimezone[1] as VObjectProperty[]).find(
      ([k]) => k.toLowerCase() === 'tzid'
    )
    if (tzidProp?.[3]) {
      const resolvedTz = resolveTimezoneId(tzidProp[3] as string)
      if (resolvedTz) {
        timezoneFromVTimezone = resolvedTz
      }
    }
  }

  let timezoneFromDTSTART: string | undefined
  const dtstartProp = (targetVevent?.[1] as VObjectProperty[])?.find(
    ([k]) => k.toLowerCase() === 'dtstart'
  )
  const dtstartParams = dtstartProp?.[1] as Record<string, string>
  const dtstartValue = dtstartProp?.[3]
  const tzParam =
    dtstartParams?.['tzid'] ??
    dtstartParams?.['TZID'] ??
    dtstartParams?.['Tzid'] ??
    dtstartParams?.['tZid'] ??
    dtstartParams?.['tzId']

  timezoneFromDTSTART = resolveTimezoneId(tzParam)

  if (
    !timezoneFromDTSTART &&
    typeof dtstartValue === 'string' &&
    dtstartValue.endsWith('Z')
  ) {
    timezoneFromDTSTART = 'UTC'
  }

  const eventjson = parseCalendarEvent(
    targetVevent[1] as VObjectProperty[],
    event.color ?? {},
    { id: event?.calId } as Calendar,
    event.URL
  )

  const finalTimezone =
    timezoneFromVTimezone ?? timezoneFromDTSTART ?? eventjson.timezone ?? 'UTC'

  eventjson.timezone = finalTimezone

  if (!eventjson.allday && eventjson.start && finalTimezone) {
    const startISO = convertEventDateTimeToISO(eventjson.start, finalTimezone)
    if (startISO) {
      eventjson.start = startISO
    }
  }

  if (!eventjson.allday && eventjson.end && finalTimezone) {
    const endISO = convertEventDateTimeToISO(eventjson.end, finalTimezone)
    if (endISO) {
      eventjson.end = endISO
    }
  }

  const merged = { ...event, ...eventjson }
  merged.timezone = finalTimezone
  return merged
}
