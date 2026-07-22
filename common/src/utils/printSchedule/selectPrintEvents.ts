import dayjs from './dayjsSetup'
import { CalendarEvent } from '@common/types/EventsTypes'
import { PrintEvent, PrintPeriod } from './types'

const DEFAULT_DURATION_MINUTES = 60

const resolveColor = (event: CalendarEvent): string | undefined =>
  event.color?.light ?? event.color?.dark

/**
 * Converts a stored {@link CalendarEvent} into a print-ready event, resolving
 * its instant into the user's timezone. All-day events keep their calendar
 * date and are never timezone-shifted.
 */
export const toPrintEvent = (
  event: CalendarEvent,
  timezone: string,
  noTitle: string
): PrintEvent => {
  const allDay = event.allday ?? false
  const start = allDay
    ? dayjs(event.start)
    : dayjs(event.start).tz(timezone)
  const rawEnd = event.end
    ? allDay
      ? dayjs(event.end)
      : dayjs(event.end).tz(timezone)
    : start.add(allDay ? 1 : DEFAULT_DURATION_MINUTES, allDay ? 'day' : 'minute')
  // Guard against malformed events whose end precedes their start.
  const end = rawEnd.isAfter(start) ? rawEnd : start.add(30, 'minute')

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
