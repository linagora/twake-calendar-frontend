import dayjs from './dayjsSetup'
import { Dayjs } from 'dayjs'
import { CalendarEvent } from '@common/types/EventsTypes'
import { PrintEvent, PrintPeriod } from './types'

const DEFAULT_DURATION_MINUTES = 60
const FALLBACK_DURATION_MINUTES = 30

const resolveColor = (event: CalendarEvent): string | undefined =>
  event.color?.light ?? event.color?.dark

// Both all-day and timed events resolve into the print timezone so their
// instants align with the timezone-anchored print range. All-day values are
// date-only, so their time component (if any) is dropped before anchoring.
// An unreadable value yields an invalid Dayjs instead of reaching `tz`, whose
// offset lookup throws a RangeError on an Invalid Date.
const resolveInstant = (
  value: string,
  allDay: boolean,
  timezone: string
): Dayjs => {
  const source = allDay ? value.split('T')[0] : value
  const parsed = dayjs(source)
  if (!parsed.isValid()) {
    return parsed
  }
  return allDay ? dayjs.tz(source, timezone) : parsed.tz(timezone)
}

// On a `dayjs.tz` instance `add` keeps the UTC offset of the start, so across
// a DST change one day later is not local midnight: `startOf` resolves the
// wall time again in the zone.
const oneDayLater = (start: Dayjs): Dayjs => start.add(1, 'day').startOf('day')

const fallbackEnd = (start: Dayjs, allDay: boolean, minutes: number): Dayjs =>
  allDay ? oneDayLater(start) : start.add(minutes, 'minute')

const resolveEnd = (
  event: CalendarEvent,
  start: Dayjs,
  allDay: boolean,
  timezone: string
): Dayjs => {
  const rawEnd = event.end
    ? resolveInstant(event.end, allDay, timezone)
    : fallbackEnd(start, allDay, DEFAULT_DURATION_MINUTES)
  // Guard against malformed events whose end is unreadable or precedes their
  // start, keeping all-day events at least a full day and timed events a
  // minute-based span.
  return rawEnd.isValid() && rawEnd.valueOf() > start.valueOf()
    ? rawEnd
    : fallbackEnd(start, allDay, FALLBACK_DURATION_MINUTES)
}

/**
 * Converts a stored {@link CalendarEvent} into a print-ready event, resolving
 * its instant into the user's timezone.
 */
export const toPrintEvent = (
  event: CalendarEvent,
  timezone: string,
  noTitle: string
): PrintEvent => {
  const allDay = event.allday ?? false
  const start = resolveInstant(event.start, allDay, timezone)
  const end = resolveEnd(event, start, allDay, timezone)

  return {
    uid: event.uid,
    title: event.title?.trim() || noTitle,
    start,
    end,
    allDay,
    location: event.location,
    color: resolveColor(event)
  }
}

export const selectPrintEvents = (
  events: CalendarEvent[],
  timezone: string,
  noTitle: string
): PrintEvent[] =>
  events
    .filter(event => Boolean(event.start))
    .map(event => toPrintEvent(event, timezone, noTitle))
    // An event whose start cannot be read has no place in the schedule; skip
    // it rather than letting it break the whole print.
    .filter(event => event.start.isValid())

/**
 * True when an event overlaps the half-open `[start, end)` range. It compares
 * the instants: on a zoned instance, isBefore and isAfter go through a wall
 * clock read back from a two-digit year (year 26 in `7/5/26`), in another
 * century than the instant.
 */
export const overlapsRange = (
  event: Pick<PrintEvent, 'start' | 'end'>,
  start: Dayjs,
  end: Dayjs
): boolean =>
  event.start.valueOf() < end.valueOf() && event.end.valueOf() > start.valueOf()

/** Events overlapping the half-open `[period.start, period.end)` range. */
export const eventsInPeriod = (
  events: PrintEvent[],
  period: Pick<PrintPeriod, 'start' | 'end'>
): PrintEvent[] =>
  events.filter(event => overlapsRange(event, period.start, period.end))
