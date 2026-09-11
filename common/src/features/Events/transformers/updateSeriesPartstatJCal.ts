import moment from 'moment-timezone'
import { TIMEZONES } from '@common/utils/timezone-data'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeTimezone } from '@common/features/Events/utils'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'
import { getTzidParam } from './recurrenceInstant'

// Helper function to find a single field value from props
const findFieldValue = (
  props: VObjectProperty[],
  fieldName: string
): VObjectProperty | undefined =>
  props.find(([k]) => k.toLowerCase() === fieldName.toLowerCase())

function parseInstant(
  prop: VObjectProperty | undefined,
  fallbackTimezone: string
): number {
  if (!prop || typeof prop[3] !== 'string') return NaN
  const tzid =
    getTzidParam(prop[1] as Record<string, unknown>) || fallbackTimezone
  const val = prop[3]
  return val.endsWith('Z')
    ? moment.utc(val).valueOf()
    : moment.tz(val, tzid).valueOf()
}

function isAllDayProp(prop: VObjectProperty | undefined): boolean {
  if (!prop || typeof prop[3] !== 'string') return false
  const val = prop[3]
  return prop[2] === 'date' || /^\d{4}-\d{2}-\d{2}$|^\d{8}$/.test(val)
}

function getDtendInstant(
  properties: VObjectProperty[],
  fallbackTimezone: string
): number {
  return parseInstant(findFieldValue(properties, 'dtend'), fallbackTimezone)
}

function getDtstartInstant(
  properties: VObjectProperty[],
  fallbackTimezone: string
): number {
  const dtstartProp = findFieldValue(properties, 'dtstart')
  const startMs = parseInstant(dtstartProp, fallbackTimezone)
  if (!Number.isFinite(startMs)) return NaN

  const durationProp = findFieldValue(properties, 'duration')
  if (durationProp && typeof durationProp[3] === 'string') {
    const durationMs = moment.duration(durationProp[3]).asMilliseconds()
    if (Number.isFinite(durationMs)) return startMs + durationMs
  }
  return isAllDayProp(dtstartProp) ? startMs + 24 * 60 * 60 * 1000 : startMs
}

function getRecurrenceIdInstant(
  properties: VObjectProperty[],
  fallbackTimezone: string
): number {
  const ridProp = findFieldValue(properties, 'recurrence-id')
  const ridMs = parseInstant(ridProp, fallbackTimezone)
  if (!Number.isFinite(ridMs)) return NaN

  return isAllDayProp(ridProp) ? ridMs + 24 * 60 * 60 * 1000 : ridMs
}

/**
 * Calculates the end instant (in epoch milliseconds) of an exception VEVENT.
 * Checks DTEND, DTSTART (+ DURATION or 1-day for all-day), or falls back to RECURRENCE-ID.
 */
export function getVeventEndInstant(
  vevent: VCalComponent,
  fallbackTimezone: string = 'UTC'
): number {
  const properties = vevent[1] as VObjectProperty[]

  const endMs = getDtendInstant(properties, fallbackTimezone)
  if (Number.isFinite(endMs)) return endMs

  const startMs = getDtstartInstant(properties, fallbackTimezone)
  if (Number.isFinite(startMs)) return startMs

  return getRecurrenceIdInstant(properties, fallbackTimezone)
}

export function isPastRecurrenceException(
  vevent: VCalComponent,
  fallbackTimezone?: string,
  nowMs: number = Date.now()
): boolean {
  const endInstant = getVeventEndInstant(vevent, fallbackTimezone || 'UTC')
  return Number.isFinite(endInstant) && endInstant < nowMs
}

export function updateSeriesPartstatJCal(
  vevents: VCalComponent[],
  event: CalendarEvent,
  attendeeEmail: string,
  partstat: string,
  nowMs?: number
): VCalComponent {
  const now = nowMs ?? Date.now()
  const fallbackTimezone = event.timezone || 'UTC'

  const masterIndex = vevents.findIndex(
    ([, props]) => !findFieldValue(props as VObjectProperty[], 'recurrence-id')
  )

  const updateVeventAttendee = (vevent: VCalComponent): VCalComponent => {
    const properties = vevent[1] as VObjectProperty[]
    const updatedProperties = properties.map(
      (prop: VObjectProperty): VObjectProperty => {
        const calAddress = (prop[3] as string | undefined) ?? ''
        // Find ATTENDEE properties & Check if this is the target attendee
        if (
          prop[0].toLowerCase() === 'attendee' &&
          normalizeEmail(calAddress) === normalizeEmail(attendeeEmail)
        ) {
          // Update PARTSTAT parameter
          const params = { ...(prop[1] as Record<string, string>), partstat }
          return [prop[0], params, prop[2], prop[3]] as VObjectProperty
        }
        return prop
      }
    )
    return [vevent[0], updatedProperties, vevent[2]] as VCalComponent
  }

  // Keep override instances:
  // Update master and future recurrence exceptions only.
  // Past recurrence exceptions are left untouched to preserve their partstat
  // and prevent sending redundant scheduling updates for past events.
  const finalVevents = vevents.map((vevent: VCalComponent, index: number) => {
    if (index === masterIndex) {
      return updateVeventAttendee(vevent)
    }

    if (isPastRecurrenceException(vevent, fallbackTimezone, now)) {
      return vevent
    }

    return updateVeventAttendee(vevent)
  })

  const timezoneData = TIMEZONES.zones[event.timezone]
  const vtimezone = makeTimezone(timezoneData, event)

  return [
    'vcalendar',
    VcalendarProperties,
    [...finalVevents, vtimezone.component.jCal as VCalComponent]
  ]
}

const normalizeEmail = (addr: string): string =>
  addr
    .trim()
    .toLowerCase()
    .replace(/^mailto:/, '')
    .trim()
