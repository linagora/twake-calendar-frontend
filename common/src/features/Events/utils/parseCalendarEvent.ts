import {
  convertEventDateTimeToISO,
  normalizeBasicDateTime
} from '@common/utils/timezone'
import moment from 'moment-timezone'
import { Calendar } from '@common/types/CalendarTypes'
import {
  RepetitionRule,
  VCalComponent,
  VObjectProperty,
  VObjectValue
} from '@common/features/Calendars/types/CalendarData'
import { userAttendee } from '@common/features/User/models/attendee'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import { buildDelegatedEventURL } from './buildDelegatedEventURL'
import { formatDateTimeToICal } from './formatDateToICal'
import { inferTimezoneFromValue } from './inferTimezoneFromValue'
import { WKST_NUM_TO_DAY } from './wkstUtils'
import { Attachment, AttachmentParams } from '@common/types/Attachment'
import { AlarmData, AlarmTriggerParams, VAlarm } from '@common/types/VAlarm'
import { Valarms } from '@common/types/Valarms'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { getTzidParam } from '@common/features/Events/transformers/recurrenceInstant'
import { occurrenceKey } from './occurrenceKey'

const KNOWN_PROPS = new Set([
  'uid',
  'transp',
  'dtstart',
  'dtend',
  'class',
  'x-openpaas-videoconference',
  'summary',
  'description',
  'location',
  'organizer',
  'attendee',
  'dtstamp',
  'sequence',
  'recurrence-id',
  'exdate',
  'status',
  'duration',
  'rrule'
])

const DATE_REGEX = /^(\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])|\d{8})$/

function safeString(value: VObjectValue): string {
  if (value && typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString()
    }
    return ''
  }
  return String(value)
}

interface PropertyContext {
  recurrenceId?: string
  recurrenceTzid?: string
  duration?: string
}

function parseDateProperty(
  params: unknown,
  value: VObjectValue,
  event: Partial<CalendarEvent>,
  isStart: boolean
): void {
  const dateStr = safeString(value)
  if (isStart) {
    event.start = dateStr
  } else {
    event.end = dateStr
  }

  if (isStart || !event.timezone) {
    const detectedTz = inferTimezoneFromValue(params as Record<string, string>)
    if (detectedTz) {
      event.timezone = detectedTz
    }
  }

  event.allday = DATE_REGEX.test(dateStr)
}

function parseAttendeeProperty(
  params: unknown,
  value: VObjectValue,
  event: Partial<CalendarEvent>
): void {
  const paramsObj = (params ?? {}) as Record<string, string>
  const { cn, partstat, rsvp, role, cutype, ...otherParams } = paramsObj
  const calAddress = safeString(value).replace(/^mailto:/i, '')

  if (!event.attendee) {
    event.attendee = []
  }

  const alreadyExists = event.attendee.some(
    attendee => attendee.cal_address === calAddress
  )

  if (!alreadyExists) {
    event.attendee.push(
      new userAttendee({
        cn,
        cal_address: calAddress,
        partstat: partstat as userAttendee['partstat'],
        rsvp: rsvp as userAttendee['rsvp'],
        role: role as userAttendee['role'],
        cutype: cutype as userAttendee['cutype'],
        otherParams
      })
    )
  }
}

// The parts of a stored RRULE the event form models
export function parseRepetitionRule(
  ruleValue: RepetitionRule
): RepetitionObject {
  const repData: Partial<RepetitionObject> = {
    freq: ruleValue.freq.toLowerCase()
  }

  if (ruleValue.byday) {
    repData.byday =
      typeof ruleValue.byday === 'string' ? [ruleValue.byday] : ruleValue.byday
  }

  if (ruleValue.until) {
    repData.endDate = ruleValue.until
  }

  // A COUNT that is not a positive integer gives no end condition
  const count = Number(ruleValue.count)
  if (Number.isInteger(count) && count > 0) {
    repData.occurrences = count
  }

  if (ruleValue.interval) {
    // Sabre serialises INTERVAL as a string in jCal
    repData.interval = Number(ruleValue.interval)
  }

  if (ruleValue.wkst != null) {
    repData.wkst =
      typeof ruleValue.wkst === 'number'
        ? (WKST_NUM_TO_DAY[ruleValue.wkst] ?? String(ruleValue.wkst))
        : ruleValue.wkst
  }

  return new RepetitionObject(repData)
}

function parseRruleProperty(
  value: VObjectValue,
  event: Partial<CalendarEvent>
): void {
  // A rule without FREQ cannot be expanded: the event stays readable, without
  // a repetition, instead of being dropped from the grid
  if (typeof (value as Partial<RepetitionRule> | null)?.freq !== 'string') {
    console.error('Ignoring an RRULE without FREQ', { uid: event.uid })
    return
  }
  event.repetition = parseRepetitionRule(value as RepetitionRule)
}

const PROPERTY_PARSERS: Record<
  string,
  (
    params: unknown,
    value: VObjectValue,
    event: Partial<CalendarEvent>,
    context: PropertyContext,
    valueType: string
  ) => void
> = {
  uid: (params, value, event) => {
    event.uid = safeString(value)
  },
  transp: (params, value, event) => {
    event.transp = safeString(value)
  },
  dtstart: (params, value, event) => {
    parseDateProperty(params, value, event, true)
  },
  dtend: (params, value, event) => {
    parseDateProperty(params, value, event, false)
  },
  class: (params, value, event) => {
    const classVal = safeString(value).trim().toUpperCase()
    if (!classVal) {
      return
    }
    // RFC 5545 3.8.1.3: unrecognized x-name / iana-token values MUST be
    // treated as PRIVATE, never defaulted to PUBLIC.
    event.class = ['PRIVATE', 'PUBLIC', 'CONFIDENTIAL'].includes(classVal)
      ? (classVal as CalendarEvent['class'])
      : 'PRIVATE'
  },
  'x-openpaas-videoconference': (params, value, event) => {
    event.x_openpass_videoconference = safeString(value)
  },
  'x-openpaas-booking-link': (params, value, event) => {
    event.bookingLinkPublicId = safeString(value)
  },
  'x-openpaas-team-calendar-id': (params, value, event) => {
    event.teamCalendarId = safeString(value)
  },
  summary: (params, value, event) => {
    event.title = safeString(value)
  },
  description: (params, value, event) => {
    event.description = safeString(value)
  },
  location: (params, value, event) => {
    event.location = safeString(value)
  },
  organizer: (params, value, event) => {
    const allParams = (params ?? {}) as Record<string, string>
    const { cn, 'sent-by': sentBy, ...otherParams } = allParams
    event.organizer = new userOrganiser({
      cn: cn ?? '',
      cal_address: safeString(value).replace(/^mailto:/i, ''),
      sentBy,
      otherParams,
      paramOrder: Object.keys(allParams)
    })
  },
  attendee: (params, value, event) => {
    parseAttendeeProperty(params, value, event)
  },
  dtstamp: (params, value, event) => {
    event.stamp = safeString(value)
  },
  sequence: (params, value, event) => {
    event.sequence = Number(value)
  },
  'recurrence-id': (params, value, event, context) => {
    context.recurrenceId = safeString(value)
    context.recurrenceTzid = getTzidParam(
      params as Record<string, unknown> | undefined
    )
  },
  exdate: (params, value, event) => {
    if (!event.exdates) event.exdates = []
    event.exdates.push(safeString(value))
  },
  status: (params, value, event) => {
    // Enumerated values are case-insensitive (RFC 5545): compared upper-cased
    event.status = safeString(value).toUpperCase()
  },
  duration: (params, value, event, context) => {
    context.duration = safeString(value)
  },
  rrule: (params, value, event) => {
    parseRruleProperty(value, event)
  },
  attach: (params, value, event, context, valueType) => {
    if (!event.attach) event.attach = []
    event.attach.push(
      Attachment.fromJcal(
        params as AttachmentParams | undefined,
        valueType,
        safeString(value)
      )
    )
  }
}

// The tables are object literals: an own-key lookup keeps names inherited from
// Object.prototype (__proto__, constructor) ignored, like any unknown property
function ownHandler<T>(table: Record<string, T>, key: string): T | undefined {
  const name = key.toLowerCase()
  return Object.hasOwn(table, name) ? table[name] : undefined
}

function parseEventProperty(
  prop: VObjectProperty,
  event: Partial<CalendarEvent>,
  context: PropertyContext
): void {
  const [key, params, valueType, value] = prop
  const parser = ownHandler(PROPERTY_PARSERS, key)
  if (parser) {
    parser(params, value, event, context, valueType)
  }
}

// The occurrence is keyed by its instant, while its recurrenceId keeps the
// stored value: the write paths match it back against the stored override.
function processEventUid(
  event: Partial<CalendarEvent>,
  recurrenceId?: string,
  recurrenceTzid?: string
): void {
  if (recurrenceId && event.uid) {
    event.uid = `${event.uid}/${occurrenceKey(recurrenceId, recurrenceTzid, event.timezone)}`
    event.recurrenceId = recurrenceId
    if (recurrenceTzid) {
      event.recurrenceTzid = recurrenceTzid
    }
  }
}

type AlarmPropertyHandler = (
  alarm: Partial<AlarmData>,
  value: VObjectValue,
  params: AlarmTriggerParams,
  type: string
) => void

const ALARM_PROPERTY_HANDLERS: Record<string, AlarmPropertyHandler> = {
  uid: (alarm, value) => {
    alarm.uid = safeString(value)
  },
  action: (alarm, value) => {
    alarm.action = safeString(value)
  },
  trigger: (alarm, value, params, type) => {
    alarm.trigger = safeString(value)
    alarm.triggerType = type
    if (Object.keys(params).length > 0) alarm.triggerParams = params
  },
  description: (alarm, value) => {
    alarm.description = safeString(value)
  },
  summary: (alarm, value) => {
    alarm.summary = safeString(value)
  }
}

function parseAlarmAttendees(
  valarmProps: [string, unknown, unknown, unknown][]
): userAttendee[] {
  const attendees: userAttendee[] = []
  for (const [key, , , value] of valarmProps) {
    if (key.toLowerCase() === 'attendee') {
      const attendee = userAttendee.fromEmailField(
        safeString(value as VObjectValue)
      )
      if (attendee) attendees.push(attendee)
    }
  }
  return attendees
}

const KNOWN_ALARM_PROPS = new Set([
  ...Object.keys(ALARM_PROPERTY_HANDLERS),
  'attendee'
])

function parseAlarmPassthroughProps(
  valarmProps: [string, unknown, unknown, unknown][]
): VObjectProperty[] {
  return valarmProps.filter(
    ([key]) => !KNOWN_ALARM_PROPS.has(key.toLowerCase())
  ) as VObjectProperty[]
}

// RFC 5545 §3.6.6: ACTION and TRIGGER are both required in a VALARM.
// An alarm missing either one cannot be rebuilt, so it is ignored.
function isCompleteAlarm(alarm: Partial<AlarmData>): alarm is AlarmData {
  return Boolean(alarm.trigger) && Boolean(alarm.action)
}

function parseSingleAlarm(
  valarm: [string, [string, unknown, unknown, unknown][], unknown[]]
): VAlarm | undefined {
  const alarm: Partial<AlarmData> = {}
  const valarmProps = valarm[1]

  for (const [key, params, type, value] of valarmProps) {
    const handler = ownHandler(ALARM_PROPERTY_HANDLERS, key)
    if (handler)
      handler(
        alarm,
        value as VObjectValue,
        (params ?? {}) as AlarmTriggerParams,
        String(type)
      )
  }

  const attendees = parseAlarmAttendees(valarmProps)
  if (attendees.length > 0) alarm.attendees = attendees

  const passthroughProps = parseAlarmPassthroughProps(valarmProps)
  if (passthroughProps.length > 0) alarm.passthroughProps = passthroughProps

  return isCompleteAlarm(alarm) ? new VAlarm(alarm) : undefined
}

function parseAlarms(valarms: unknown): Valarms | undefined {
  if (!Array.isArray(valarms) || !valarms.length) return undefined

  const alarms = (
    valarms as Array<[string, [string, unknown, unknown, unknown][], unknown[]]>
  )
    .map(parseSingleAlarm)
    .filter((alarm): alarm is VAlarm => alarm !== undefined)

  return alarms.length ? Valarms.fromList(alarms) : undefined
}

// A wall clock is read in the zone of the event, not of the browser
function readStartInstant(start?: string, timezone?: string): Date {
  if (!start) return new Date()
  return new Date(
    (timezone && convertEventDateTimeToISO(start, timezone)) ||
      normalizeBasicDateTime(start)
  )
}

function computeMissingEnd(
  start?: string,
  timezone?: string,
  duration?: string
): string | undefined {
  const startInstant = readStartInstant(start, timezone)
  // A start the client cannot read (a second 60...) gives no end to compute
  if (isNaN(startInstant.getTime())) return start

  const timeToAdd = duration
    ? moment.duration(duration).asMilliseconds()
    : moment.duration(30, 'minutes').asMilliseconds()
  const artificialEnd = new Date(startInstant.getTime() + timeToAdd)
  // The instant itself: a wall clock in the hour repeated at the end of
  // summer time would be read back as its first occurrence
  return timezone
    ? artificialEnd.toISOString()
    : formatDateTimeToICal(artificialEnd)
}

function processEventDates(
  event: Partial<CalendarEvent>,
  duration?: string
): void {
  const eventTimezone = event.timezone

  // RFC 5545 §3.6.1: an all-day event without DTEND nor DURATION lasts one day
  if (!event.end && event.allday && event.start) {
    event.end = moment
      .utc(event.start)
      .add(moment.duration(duration ?? 'P1D'))
      .format('YYYY-MM-DD')
  }

  const endsWhenItStarts = !event.end && !event.allday && !duration
  if (!event.end) {
    event.end = computeMissingEnd(event.start, eventTimezone, duration)
  }

  if (!event.allday && eventTimezone) {
    if (event.start) {
      event.start =
        convertEventDateTimeToISO(event.start, eventTimezone) ?? event.start
    }

    if (event.end) {
      event.end =
        convertEventDateTimeToISO(event.end, eventTimezone) ?? event.end
    }
  }

  // RFC 5545 §3.6.1: the 30 minutes given above are for display only
  if (endsWhenItStarts && event.start && event.end) {
    event.implicitEnd = { start: event.start, end: event.end }
  }
}

export function parseCalendarEvent({
  data,
  color,
  calendar,
  eventURL,
  valarms,
  timezoneOfTheCalendarObject
}: {
  data: VObjectProperty[]
  color: Record<string, string>
  calendar: Calendar
  eventURL: string
  valarms?: VCalComponent[]
  timezoneOfTheCalendarObject?: string
}): CalendarEvent {
  const event: Partial<CalendarEvent> = { color, attendee: [] }
  const context: PropertyContext = {}

  for (const prop of data) {
    parseEventProperty(prop, event, context)
  }

  // A zone stated on DTSTART itself is the one of that very occurrence, and
  // wins over the one of the calendar object it belongs to. Settling it here,
  // once every property has spoken, is what lets the dates and the recurrence
  // rule below both be built in the zone the event was written in.
  if (!event.timezone) {
    event.timezone = timezoneOfTheCalendarObject
  }

  processEventUid(event, context.recurrenceId, context.recurrenceTzid)

  const alarms = parseAlarms(valarms)
  if (alarms?.hasAlarms()) {
    event.alarms = alarms
  }

  event.calId = calendar.id
  event.URL = calendar.delegated
    ? buildDelegatedEventURL(calendar, eventURL)
    : eventURL

  if (!event.uid || !event.start) {
    // Only identifiers: the event itself (title, description, attendees)
    // must not reach the console, which is forwarded to Sentry.
    console.error(
      `missing crucial event param in calendar ${calendar.id} (uid: ${event.uid ?? 'none'}, url: ${eventURL})`
    )
    event.error = `missing crucial event param in calendar ${calendar.id} `
  }

  processEventDates(event, context.duration)

  if (event.repetition) {
    event.repetition = RepetitionObject.fromFormValues(event.repetition, {
      allday: event.allday,
      timezone: event.timezone
    })
  }

  event.passthroughProps = data.filter(
    ([key]) => !KNOWN_PROPS.has(key.toLowerCase())
  )

  return event as CalendarEvent
}
