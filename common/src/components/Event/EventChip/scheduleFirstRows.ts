import type { CalendarApi, EventApi } from '@fullcalendar/react'
import moment from 'moment-timezone'
import { sortEventsByDateTime } from '@common/components/Calendar/utils/calendarUtils'
import { CalendarEvent } from '@common/types/EventsTypes'

const DAY_FORMAT = 'YYYY-MM-DD'

// Maps a day (YYYY-MM-DD in the display time zone) to the instance key of the
// first event listed on that day
export type FirstRowByDay = Map<string, string>

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

const daysCovered = (e: EventApi, timezone: string): string[] => {
  if (!e.start) return []
  const start = moment(e.start).tz(timezone).startOf('day')
  // The end is exclusive: an all-day event ending on the 8th lasts until the 7th
  const lastDay = e.end
    ? moment(e.end).tz(timezone).subtract(1, 'millisecond').startOf('day')
    : start
  const days = [start.format(DAY_FORMAT)]
  for (
    const day = start.clone().add(1, 'day');
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
  timezone: string
): FirstRowByDay => {
  const firstByDay = new Map<string, EventApi>()
  events.forEach(event =>
    daysCovered(event, timezone).forEach(day => {
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

// Every row of the schedule asks for its day: build the index once per set of
// events instead of scanning and sorting all the events for each row (#2220)
export const getFirstRowByDay = (
  calendar: CalendarApi,
  timezone: string
): FirstRowByDay => {
  const eventStore = getEventStore(calendar)
  const cached = eventStore ? cache.get(eventStore) : undefined
  if (cached && cached.timezone === timezone) return cached.firstRows

  const firstRows = buildFirstRowByDay(calendar.getEvents(), timezone)
  if (eventStore) cache.set(eventStore, { timezone, firstRows })
  return firstRows
}
