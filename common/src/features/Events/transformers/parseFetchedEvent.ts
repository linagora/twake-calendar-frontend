import {
  convertEventDateTimeToISO,
  resolveTimezoneId
} from '@common/utils/timezone'
import ICAL from 'ical.js'
import { Calendar } from '@common/types/CalendarTypes'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { parseCalendarEvent } from '@common/features/Events/utils'

function filterComponents(
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
    ([, props]) =>
      !(props as VObjectProperty[]).find(
        ([k]) => k.toLowerCase() === 'recurrence-id'
      )
  )
  return master ?? vevents[0]
}

function resolveTimezoneFromVTimezone(
  vtimezones: VCalComponent[]
): string | undefined {
  if (vtimezones.length === 0) {
    return undefined
  }
  const tzidProp = (vtimezones[0][1] as VObjectProperty[]).find(
    ([k]) => k.toLowerCase() === 'tzid'
  )
  if (!tzidProp?.[3]) {
    return undefined
  }
  return resolveTimezoneId(tzidProp[3] as string) ?? undefined
}

function resolveTimezoneFromDtstart(
  targetVevent: VCalComponent
): string | undefined {
  const dtstartProp = (targetVevent[1] as VObjectProperty[]).find(
    ([k]) => k.toLowerCase() === 'dtstart'
  )
  const dtstartParams = dtstartProp?.[1] as Record<string, string> | undefined
  const dtstartValue = dtstartProp?.[3]

  const tzParam = getTimeZone(dtstartParams)

  const resolved = resolveTimezoneId(tzParam)
  if (resolved) {
    return resolved
  }
  if (typeof dtstartValue === 'string' && dtstartValue.endsWith('Z')) {
    return 'UTC'
  }
  return undefined
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

  const timezoneFromVTimezone = resolveTimezoneFromVTimezone(vtimezones)
  const timezoneFromDtstart = resolveTimezoneFromDtstart(targetVevent)

  const eventjson = parseCalendarEvent({
    data: targetVevent[1] as VObjectProperty[],
    color: event.color ?? {},
    calendar: { id: event?.calId } as Calendar,
    eventURL: event.URL
  })

  const finalTimezone =
    timezoneFromVTimezone ?? timezoneFromDtstart ?? eventjson.timezone ?? 'UTC'

  eventjson.timezone = finalTimezone
  applyTimezoneToDateFields(eventjson, finalTimezone)

  return { ...event, ...eventjson, timezone: finalTimezone }
}
