import dayjs from './dayjsSetup'
import { Dayjs } from 'dayjs'
import { CalendarEvent } from '@common/types/EventsTypes'
import { PrintEvent, PrintPeriod } from './types'

const DEFAULT_DURATION_MINUTES = 60
const FALLBACK_DURATION_MINUTES = 30

const resolveColor = (event: CalendarEvent): string | undefined =>
  event.color?.light ?? event.color?.dark

// All-day events keep their calendar date; timed events resolve into the
// user's timezone.
const resolveInstant = (
  value: string,
  allDay: boolean,
  timezone: string
): Dayjs => (allDay ? dayjs(value) : dayjs(value).tz(timezone))

const resolveEnd = (
  event: CalendarEvent,
  start: Dayjs,
  allDay: boolean,
  timezone: string
): Dayjs => {
  const rawEnd = event.end
    ? resolveInstant(event.end, allDay, timezone)
    : start.add(allDay ? 1 : DEFAULT_DURATION_MINUTES, allDay ? 'day' : 'minute')
  // Guard against malformed events whose end precedes their start.
  return rawEnd.isAfter(start)
    ? rawEnd
    : start.add(FALLBACK_DURATION_MINUTES, 'minute')
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

/** Events overlapping the half-open `[period.start, period.end)` range. */
export const eventsInPeriod = (
  events: PrintEvent[],
  period: Pick<PrintPeriod, 'start' | 'end'>
): PrintEvent[] =>
  events.filter(
    event => event.start.isBefore(period.end) && event.end.isAfter(period.start)
  )
