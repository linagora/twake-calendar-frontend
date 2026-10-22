import moment from 'moment-timezone'
import { TIMEZONES } from '@common/utils/timezone-data'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  makeTimezone,
  findFieldValue,
  parseInstant,
  parseMoment
} from '@common/features/Events/utils'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'

function isAllDayProp(prop: VObjectProperty | undefined): boolean {
  if (!prop || typeof prop[3] !== 'string') return false
  const val = prop[3]
  return prop[2] === 'date' || /^\d{4}-\d{2}-\d{2}$|^\d{8}$/.test(val)
}

function getPropEndInstant(
  properties: VObjectProperty[],
  fieldName: 'dtstart' | 'recurrence-id',
  fallbackTimezone: string
): number {
  const prop = findFieldValue(properties, fieldName)
  const propMoment = parseMoment(prop, fallbackTimezone)
  if (!propMoment) return NaN

  const durationProp = findFieldValue(properties, 'duration')
  if (durationProp && typeof durationProp[3] === 'string') {
    const match = durationProp[3].match(/^\+?P(\d+)(D|W)$/i)
    if (match) {
      const unit = match[2].toUpperCase() === 'D' ? 'days' : 'weeks'
      return propMoment.clone().add(parseInt(match[1], 10), unit).valueOf()
    }
    const duration = moment.duration(durationProp[3])
    if (duration.isValid()) {
      return propMoment.clone().add(duration).valueOf()
    }
  }

  return isAllDayProp(prop)
    ? propMoment.clone().add(1, 'day').valueOf()
    : propMoment.valueOf()
}

/**
 * Calculates the end instant (in epoch milliseconds) of an exception VEVENT.
 * Checks DTEND, DTSTART (+ DURATION or 1-day for all-day), or falls back to RECURRENCE-ID.
 */
export function getVeventEndInstant(
  vevent: VCalComponent,
  fallbackTimezone: string = 'UTC'
): number {
  const properties = vevent[1]

  const endMs = parseInstant(
    findFieldValue(properties, 'dtend'),
    fallbackTimezone
  )
  if (Number.isFinite(endMs)) return endMs

  const startMs = getPropEndInstant(properties, 'dtstart', fallbackTimezone)
  if (Number.isFinite(startMs)) return startMs

  return getPropEndInstant(properties, 'recurrence-id', fallbackTimezone)
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
    ([, props]) => !findFieldValue(props, 'recurrence-id')
  )

  const updateVeventAttendee = (vevent: VCalComponent): VCalComponent => {
    const properties = vevent[1]
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
