import { extractEventBaseUuid } from '@/utils/extractEventBaseUuid'
import { convertEventDateTimeToISO, resolveTimezoneId } from '@/utils/timezone'
import { TIMEZONES } from '@/utils/timezone-data'
import ICAL from 'ical.js'
import { Calendar } from '../Calendars/CalendarTypes'
import {
  VCalComponent,
  VObjectProperty,
  VObjectValue
} from '../Calendars/types/CalendarData'
import { CounterProposalPayload } from './EventDao'
import { CalendarEvent } from './EventsTypes'
import { makeTimezone, makeVevent, parseCalendarEvent } from './utils'

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
  const dtstartProp = (targetVevent[1] as VObjectProperty[]).find(
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
    timezoneFromDTSTART = 'Etc/UTC'
  }

  const eventjson = parseCalendarEvent(
    targetVevent[1] as VObjectProperty[],
    event.color ?? {},
    { id: event?.calId } as Calendar,
    event.URL
  )

  const finalTimezone =
    timezoneFromVTimezone ??
    timezoneFromDTSTART ??
    eventjson.timezone ??
    'Etc/UTC'

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

export function makeEventWithOverrides(
  updatedEvent: CalendarEvent,
  vevents: VCalComponent[],
  calOwnerEmail?: string
): VCalComponent {
  const updatedVevent = makeVevent(
    updatedEvent,
    updatedEvent.timezone,
    calOwnerEmail,
    !updatedEvent.recurrenceId
  )
  let replaced = false
  for (let i = 0; i < vevents.length; i++) {
    const ve = vevents[i]
    const recurrenceId = (ve[1] as VObjectProperty[]).find(
      ([k]) => k === 'recurrence-id'
    )
    if (recurrenceId && recurrenceId[3] === updatedEvent.recurrenceId) {
      vevents[i] = updatedVevent as VCalComponent // replace
      replaced = true
      break
    }
  }
  if (!replaced && updatedEvent.recurrenceId) {
    vevents.push(updatedVevent as VCalComponent) // add new override
  }

  const timezoneData = TIMEZONES.zones[updatedEvent.timezone]
  const vtimezone = makeTimezone(timezoneData, updatedEvent)

  return ['vcalendar', [], [...vevents, vtimezone.component.jCal]]
}

export const makeDeleteEventInstanceJCal = (
  vevents: VCalComponent[],
  event: CalendarEvent
): VCalComponent => {
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
  const seriesEvent = parseCalendarEvent(
    vevents[masterIndex][1] as VObjectProperty[],
    {},
    { id: event.calId } as Calendar,
    ''
  )
  const masterProps = vevents[masterIndex][1] as VObjectProperty[]

  const normalizeRecurrenceId = (id: VObjectValue): string =>
    (typeof id === 'string' || typeof id === 'number'
      ? String(id)
      : ''
    ).replace(/Z$/, '')

  const isDuplicate = masterProps.some((prop: VObjectProperty) => {
    if (prop[0].toLowerCase() === 'exdate' && prop[3]) {
      return (
        normalizeRecurrenceId(prop[3]) ===
        normalizeRecurrenceId(exdateValue as VObjectValue)
      )
    }
    return false
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
      normalizeRecurrenceId((event.recurrenceId ?? '') as VObjectValue)
    ) // Remove matching override
  })

  // Build the updated jCal with all VEVENTs and timezone
  const timezoneData = TIMEZONES.zones[seriesEvent.timezone]
  const vtimezone = makeTimezone(timezoneData, seriesEvent)

  return ['vcalendar', [], [...filteredVevents, vtimezone.component.jCal]]
}

export const updateSeriesPartstatJCal = (
  vevents: VCalComponent[],
  event: CalendarEvent,
  attendeeEmail: string,
  partstat: string
): VCalComponent => {
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

export function makeSearchEventParam(
  query: string,
  filters: {
    searchIn: string[]
    keywords: string
    organizers: string[]
    attendees: string[]
  }
): {
  query: string
  calendars: {
    calendarId: string
    userId: string
  }[]
  organizers?: string[] | undefined
  attendees?: string[] | undefined
} {
  const { keywords, searchIn, organizers, attendees } = filters

  const reqParam: {
    query: string
    calendars: { calendarId: string; userId: string }[]
    organizers?: string[]
    attendees?: string[]
  } = {
    query: keywords || query,
    calendars: searchIn.map(calId => {
      const [userId, calendarId] = calId.split('/')
      return { calendarId, userId }
    })
  }
  if (organizers.length) {
    reqParam.organizers = organizers
  }
  if (attendees.length) {
    reqParam.attendees = attendees
  }
  return reqParam
}

export function makeCounterProposalPayload({
  event,
  senderEmail,
  recipientEmail,
  proposedStart,
  proposedEnd,
  message
}: {
  event: CalendarEvent
  senderEmail: string
  recipientEmail: string
  proposedStart: string
  proposedEnd: string
  message?: string
}): CounterProposalPayload {
  // Build the counter event with proposed dates
  const counterEvent: CalendarEvent = {
    ...event,
    start: proposedStart,
    end: proposedEnd,
    sequence: event.sequence ?? 0
  }
  // Build vevent jCal
  const vevent = makeVevent(
    counterEvent,
    counterEvent.timezone,
    senderEmail,
    !event.recurrenceId
  )
  if (message) {
    vevent[1].push(['comment', {}, 'text', message])
  }
  // Build vtimezone
  const timezoneData = TIMEZONES.zones[counterEvent.timezone]
  const vtimezone = makeTimezone(timezoneData, counterEvent)

  // Assemble full vcalendar with METHOD:COUNTER
  const jcal = [
    'vcalendar',
    [
      ['version', {}, 'text', '2.0'],
      ['prodid', {}, 'text', '-//OpenPaaS//OpenPaaS//EN'],
      ['method', {}, 'text', 'COUNTER']
    ],
    [vevent, vtimezone.component.jCal]
  ]

  // Serialize to raw ICS
  const counterICS = new ICAL.Component(jcal).toString()
  const payload: CounterProposalPayload = {
    ical: counterICS,
    sender: senderEmail,
    recipient: recipientEmail,
    uid: extractEventBaseUuid(event.uid),
    sequence: counterEvent.sequence ?? 0,
    method: 'COUNTER'
  }
  return payload
}
