import { convertEventDateTimeToISO } from '@common/utils/timezone'
import moment from 'moment-timezone'
import { Calendar } from '@common/types/CalendarTypes'
import {
  RepetitionRule,
  VCalComponent,
  VObjectProperty,
  VObjectValue
} from '@common/features/Calendars/types/CalendarData'
import { userAttendee } from '@common/features/User/models/attendee'
import { createAttendee } from '@common/features/User/models/attendee.mapper'
import { AlarmObject, CalendarEvent } from '@common/types/EventsTypes'
import { buildDelegatedEventURL } from './buildDelegatedEventURL'
import { formatDateTimeToICal } from './formatDateToICal'
import { inferTimezoneFromValue } from './inferTimezoneFromValue'
import { WKST_NUM_TO_DAY } from './wkstUtils'

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
  const paramsObj = params as Record<string, string>
  const calAddress = safeString(value).replace(/^mailto:/i, '')

  if (!event.attendee) {
    event.attendee = []
  }

  const alreadyExists = event.attendee.some(
    attendee => attendee.cal_address === calAddress
  )

  if (!alreadyExists) {
    event.attendee.push(
      createAttendee({
        cn: paramsObj?.cn,
        cal_address: calAddress,
        partstat: paramsObj?.partstat as userAttendee['partstat'],
        rsvp: paramsObj?.rsvp as userAttendee['rsvp'],
        role: paramsObj?.role as userAttendee['role'],
        cutype: paramsObj?.cutype as userAttendee['cutype']
      })
    )
  }
}

function parseRruleProperty(
  value: VObjectValue,
  event: Partial<CalendarEvent>
): void {
  const ruleValue = value as RepetitionRule
  event.repetition = { freq: ruleValue.freq.toLowerCase() }

  if (ruleValue.byday) {
    event.repetition.byday =
      typeof ruleValue.byday === 'string' ? [ruleValue.byday] : ruleValue.byday
  }

  if (ruleValue.until) {
    event.repetition.endDate = ruleValue.until
  }

  if (ruleValue.count) {
    event.repetition.occurrences = ruleValue.count
  }

  if (ruleValue.interval) {
    event.repetition.interval = ruleValue.interval
  }

  if (ruleValue.wkst != null) {
    event.repetition.wkst =
      typeof ruleValue.wkst === 'number'
        ? (WKST_NUM_TO_DAY[ruleValue.wkst] ?? String(ruleValue.wkst))
        : ruleValue.wkst
  }
}

const PROPERTY_PARSERS: Record<
  string,
  (
    params: unknown,
    value: VObjectValue,
    event: Partial<CalendarEvent>,
    context: PropertyContext
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
    const classVal = safeString(value).toUpperCase()
    if (['PRIVATE', 'PUBLIC', 'CONFIDENTIAL'].includes(classVal)) {
      event.class = classVal as CalendarEvent['class']
    }
  },
  'x-openpaas-videoconference': (params, value, event) => {
    event.x_openpass_videoconference = safeString(value)
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
    const paramsObj = params as Record<string, string>
    event.organizer = {
      cn: paramsObj?.cn ?? '',
      cal_address: safeString(value).replace(/^mailto:/i, '')
    }
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
  },
  exdate: (params, value, event) => {
    if (!event.exdates) event.exdates = []
    event.exdates.push(safeString(value))
  },
  status: (params, value, event) => {
    event.status = safeString(value)
  },
  duration: (params, value, event, context) => {
    context.duration = safeString(value)
  },
  rrule: (params, value, event) => {
    parseRruleProperty(value, event)
  },
  attach: (params, value, event) => {
    if (!event.attach) event.attach = []
    event.attach.push({
      uri: safeString(value),
      fmttype: params.fmttype,
      x_filename: params['x-filename']
    })
  }
}

function parseEventProperty(
  prop: VObjectProperty,
  event: Partial<CalendarEvent>,
  context: PropertyContext
): void {
  const [key, params, , value] = prop
  const parser = PROPERTY_PARSERS[key.toLowerCase()]
  if (parser) {
    parser(params, value, event, context)
  }
}

function processEventUid(
  event: Partial<CalendarEvent>,
  recurrenceId?: string
): void {
  if (recurrenceId && event.uid) {
    event.uid = `${event.uid}/${recurrenceId}`
    event.recurrenceId = recurrenceId
  }
}

function parseAlarm(valarm?: VCalComponent): AlarmObject | undefined {
  if (!valarm) {
    return undefined
  }
  const alarm = {} as AlarmObject
  for (const [key, , , value] of valarm[1]) {
    switch (key.toLowerCase()) {
      case 'action':
        alarm.action = safeString(value)
        break
      case 'trigger':
        alarm.trigger = safeString(value)
        break
    }
  }
  return alarm
}

function processEventDates(
  event: Partial<CalendarEvent>,
  duration?: string
): void {
  const eventTimezone = event.timezone

  if (!event.end) {
    const start = event.start ? new Date(event.start) : new Date()
    const timeToAdd = duration
      ? moment.duration(duration).asMilliseconds()
      : moment.duration(30, 'minutes').asMilliseconds()
    const artificialEnd = new Date(start.getTime() + timeToAdd)
    event.end = formatDateTimeToICal(artificialEnd, eventTimezone)
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
}

export function parseCalendarEvent({
  data,
  color,
  calendar,
  eventURL,
  valarm
}: {
  data: VObjectProperty[]
  color: Record<string, string>
  calendar: Calendar
  eventURL: string
  valarm?: VCalComponent
}): CalendarEvent {
  const event: Partial<CalendarEvent> = { color, attendee: [] }
  const context: PropertyContext = {}

  for (const prop of data) {
    parseEventProperty(prop, event, context)
  }

  processEventUid(event, context.recurrenceId)

  const alarm = parseAlarm(valarm)
  if (alarm) {
    event.alarm = alarm
  }

  event.calId = calendar.id
  event.URL = calendar.delegated
    ? buildDelegatedEventURL(calendar, eventURL)
    : eventURL

  if (!event.uid || !event.start) {
    console.error(
      `missing crucial event param in calendar ${calendar.id} `,
      data
    )
    event.error = `missing crucial event param in calendar ${calendar.id} `
  }

  processEventDates(event, context.duration)

  event.passthroughProps = data.filter(
    ([key]) => !KNOWN_PROPS.has(key.toLowerCase())
  )

  return event as CalendarEvent
}
