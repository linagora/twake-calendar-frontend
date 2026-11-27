import type { CalendarApi, EventApi } from '@fullcalendar/react'
import moment from 'moment-timezone'
import { sortEventsByDateTime } from '@common/components/Calendar/utils/calendarUtils'
import { CalendarEvent } from '@common/types/EventsTypes'

const DAY_FORMAT = 'YYYY-MM-DD'

// Maps a day (YYYY-MM-DD in the display time zone) to the instance key of the
// first event listed on that day
export type FirstRowByDay = Map<string, string>

// The range the schedule displays, end excluded, as FullCalendar's active range
export interface DisplayedRange {
  start: Date
  end: Date
}

export const getEventInstanceKey = (e: EventApi): string => {
  // Use FullCalendar's internal instanceId (unique per occurrence) when available.
  // This prevents recurring events sharing the same id/calId/start from all
  // matching as the "first" event and showing the day indicator multiple times.
  const instanceId = (e as unknown as { _instance?: { instanceId?: string } })
    ._instance?.instanceId
  if (instanceId) return instanceId
  const ext = e.extendedProps as unknown as CalendarEvent
  return `${e.id}_${ext.calId ?? ''}_${e.start?.getTime() ?? ''}`
}

// Only the days in view can have rows: clipping the event to them bounds the
// work by the view, not by the span of the event, which nothing limits (#2237)
const daysCovered = (
  e: EventApi,
  timezone: string,
  range: DisplayedRange
): string[] => {
  if (!e.start) return []
  const eventStart = moment(e.start).tz(timezone)
  // The end is exclusive: an all-day event ending on the 8th lasts until the 7th
  const eventLast = e.end
    ? moment(e.end).tz(timezone).subtract(1, 'millisecond')
    : eventStart
  const rangeStart = moment(range.start).tz(timezone)
  const rangeLast = moment(range.end).tz(timezone).subtract(1, 'millisecond')
  const lastDay = moment.min(eventLast, rangeLast).clone().startOf('day')
  const days: string[] = []
  for (
    const day = moment.max(eventStart, rangeStart).clone().startOf('day');
    !day.isAfter(lastDay);
    day.add(1, 'day')
  ) {
    days.push(day.format(DAY_FORMAT))
  }
  return days
}

// One pass over the events: each day keeps the event sorting first on it,
// the earliest listed one on a tie, as a stable sort would
export const buildFirstRowByDay = (
  events: EventApi[],
  timezone: string,
  range: DisplayedRange
): FirstRowByDay => {
  const firstByDay = new Map<string, EventApi>()
  events.forEach(event =>
    daysCovered(event, timezone, range).forEach(day => {
      const current = firstByDay.get(day)
      if (!current || sortEventsByDateTime(event, current) < 0) {
        firstByDay.set(day, event)
      }
    })
  )
  return new Map(
    [...firstByDay].map(([day, event]) => [day, getEventInstanceKey(event)])
  )
}

interface CachedFirstRows {
  timezone: string
  range: DisplayedRange
  firstRows: FirstRowByDay
}

// FullCalendar replaces its event store on every change of the events, so the
// store identifies the set of events the index was built from
const cache = new WeakMap<object, CachedFirstRows>()

const getEventStore = (calendar: CalendarApi): object | undefined =>
  (
    calendar as unknown as {
      getCurrentData?: () => { eventStore?: object } | undefined
    }
  ).getCurrentData?.()?.eventStore

const getDisplayedRange = (calendar: CalendarApi): DisplayedRange => ({
  start: calendar.view.activeStart,
  end: calendar.view.activeEnd
})

const isSameRange = (a: DisplayedRange, b: DisplayedRange): boolean =>
  a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime()

const isUpToDate = (
  cached: CachedFirstRows | undefined,
  timezone: string,
  range: DisplayedRange
): cached is CachedFirstRows =>
  !!cached && cached.timezone === timezone && isSameRange(cached.range, range)

// Every row of the schedule asks for its day: build the index once per set of
// events and displayed range instead of scanning and sorting all the events
// for each row (#2220)
export const getFirstRowByDay = (
  calendar: CalendarApi,
  timezone: string
): FirstRowByDay => {
  const range = getDisplayedRange(calendar)
  const eventStore = getEventStore(calendar)
  const cached = eventStore ? cache.get(eventStore) : undefined
  if (isUpToDate(cached, timezone, range)) return cached.firstRows

  const firstRows = buildFirstRowByDay(calendar.getEvents(), timezone, range)
  if (eventStore) cache.set(eventStore, { timezone, range, firstRows })
  return firstRows
}
