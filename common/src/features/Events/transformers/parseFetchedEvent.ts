import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { parseCalendarEvent } from '@common/features/Events/utils'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  convertEventDateTimeToISO,
  resolveTimezoneId
} from '@common/utils/timezone'
import ICAL from 'ical.js'

export function filterComponents(
  eventical: VCalComponent,
  componentName: string
): VCalComponent[] {
  return (eventical[2] ?? []).filter(
    ([name]) => name.toLowerCase() === componentName
  )
}

function selectTargetVevent(
  vevents: VCalComponent[],
  isMaster?: boolean
): VCalComponent | undefined {
  if (!isMaster) {
    return vevents[0]
  }
  const master = vevents.find(
    ([, props]) => !props.find(([k]) => k.toLowerCase() === 'recurrence-id')
  )
  return master ?? vevents[0]
}

function resolveTimezoneFromVTimezone(
  vtimezones: VCalComponent[]
): string | undefined {
  if (vtimezones.length === 0) {
    return undefined
  }
  const tzidProp = vtimezones[0][1].find(([k]) => k.toLowerCase() === 'tzid')
  if (!tzidProp?.[3]) {
    return undefined
  }
  return resolveTimezoneId(tzidProp[3] as string) ?? undefined
}

function findDtstart(targetVevent: VCalComponent): VObjectProperty | undefined {
  return targetVevent[1].find(([k]) => k.toLowerCase() === 'dtstart')
}

function resolveTimezoneFromDtstartTzid(
  targetVevent: VCalComponent
): string | undefined {
  const dtstart = findDtstart(targetVevent)
  return resolveTimezoneId(
    getTimeZone(dtstart?.[1] as Record<string, string> | undefined)
  )
}

function isUtcDtstart(targetVevent: VCalComponent): boolean {
  const dtstartValue = findDtstart(targetVevent)?.[3]
  return typeof dtstartValue === 'string' && dtstartValue.endsWith('Z')
}

function getTimeZone(
  dtstartParams: Record<string, string> | undefined
): string | undefined {
  return (
    dtstartParams?.['tzid'] ??
    dtstartParams?.['TZID'] ??
    dtstartParams?.['Tzid'] ??
    dtstartParams?.['tZid'] ??
    dtstartParams?.['tzId']
  )
}

function applyTimezoneToDateFields(
  eventjson: CalendarEvent,
  timezone: string
): void {
  if (eventjson.allday) {
    return
  }
  const startISO = convertEventDateTimeToISO(eventjson.start, timezone)
  const endISO = convertEventDateTimeToISO(eventjson.end, timezone)

  if (startISO) {
    eventjson.start = startISO
  }
  if (endISO) {
    eventjson.end = endISO
  }
}

export function parseFetchedEvent(
  event: CalendarEvent,
  eventData: VCalComponent | string,
  isMaster?: boolean
): CalendarEvent {
  const eventical =
    typeof eventData === 'string'
      ? (ICAL.parse(eventData) as VCalComponent)
      : eventData
  const vevents = filterComponents(eventical, 'vevent')
  const vtimezones = filterComponents(eventical, 'vtimezone')

  const targetVevent = selectTargetVevent(vevents, isMaster)
  if (!targetVevent) {
    return event
  }

  // The TZID of DTSTART is the zone the event is written in, and wins over the
  // first VTIMEZONE of the object: a calendar object may bundle several, the
  // first one being another zone than the one of the event. Reading that one
  // made a drag and drop rewrite the event in it (#1547), where the grid and
  // the form, which trust DTSTART first, kept the zone of the event.
  const timezoneFromDtstart = resolveTimezoneFromDtstartTzid(targetVevent)
  const timezoneFromVTimezone = resolveTimezoneFromVTimezone(vtimezones)
  const timezoneFromUtcValue = isUtcDtstart(targetVevent) ? 'UTC' : undefined

  const eventjson = parseCalendarEvent({
    data: targetVevent[1],
    color: event.color ?? {},
    calendar: { id: event?.calId } as Calendar,
    eventURL: event.URL,
    valarms: filterComponents(targetVevent, 'valarm')
  })

  const finalTimezone =
    timezoneFromDtstart ??
    timezoneFromVTimezone ??
    timezoneFromUtcValue ??
    eventjson.timezone ??
    'UTC'

  eventjson.timezone = finalTimezone
  applyTimezoneToDateFields(eventjson, finalTimezone)

  return { ...event, ...eventjson, timezone: finalTimezone }
}
