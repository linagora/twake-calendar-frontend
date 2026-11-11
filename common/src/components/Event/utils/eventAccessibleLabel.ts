import { Calendar } from '@common/types/CalendarTypes'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { renameDefault } from '@common/utils/renameDefault'

type Translate = (key: string, options?: Record<string, string>) => string

const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Answers the chip only draws (strike-through, dashed border, transparency)
const ANNOUNCED_PARTSTATS = ['TENTATIVE', 'DECLINED', 'NEEDS-ACTION']

export interface EventAccessibleLabelParams {
  title?: string
  start: Date
  end?: Date | null
  allDay: boolean
  calendarName?: string
  partstat?: string
  timeZone: string
  t: Translate
}

/** The calendar name the sidebar shows, e.g. not "#default" */
export function calendarLabel(
  calendar: Calendar | undefined,
  userId: string | undefined,
  t: Translate
): string | undefined {
  if (!calendar) return undefined
  return renameDefault(
    calendar.name,
    makeDisplayName(calendar) ?? '',
    // renameDefault only passes string params
    t as Parameters<typeof renameDefault>[2],
    calendar.id?.split('/')[0] === userId
  )
}

/**
 * The calendar day of an ISO string (e.g. FullCalendar's "2026-11-12"), at
 * midnight UTC as eventAccessibleLabel expects for all-day events. The grid's
 * Date objects of an all-day event are at midnight in the calendar time zone,
 * the day before in UTC for every zone east of it.
 */
export function allDayDate(isoDate: string): Date {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)
}

// How the user reads dates and times
interface Reading {
  locale: string
  timeZone: string
}

// The day, or the first and last days of an event over several days
function dateLabel(
  start: Date,
  end: Date | undefined,
  allDay: boolean,
  { locale, timeZone }: Reading
): string {
  const formatDay = (d: Date): string =>
    d.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      // All-day dates are calendar dates, stored at midnight UTC
      timeZone: allDay ? 'UTC' : timeZone
    })
  // The end of an all-day event is the day following its last day
  const lastDay = end
    ? new Date(end.getTime() - (allDay ? ONE_DAY_MS : 0))
    : start
  const firstDayLabel = formatDay(start)
  const lastDayLabel = formatDay(lastDay)
  return lastDay > start && lastDayLabel !== firstDayLabel
    ? `${firstDayLabel} – ${lastDayLabel}`
    : firstDayLabel
}

function timeLabel(
  start: Date,
  end: Date | undefined,
  { locale, timeZone }: Reading
): string {
  const formatTime = (d: Date): string =>
    d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone
    })
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

function statusLabel(partstat: string | undefined, t: Translate): string {
  return partstat && ANNOUNCED_PARTSTATS.includes(partstat)
    ? `, ${t(`eventPreview.attendee.${partstat}`)}`
    : ''
}

/**
 * The name a screen reader gives an event chip or a search result: what the
 * user reads on screen (title, day, time) plus what is only drawn (calendar
 * colour, own answer).
 */
export function eventAccessibleLabel({
  title,
  start,
  end,
  allDay,
  calendarName,
  partstat,
  timeZone,
  t
}: EventAccessibleLabelParams): string {
  const reading = { locale: t('locale'), timeZone }
  // An end at or before the start says nothing more than the start
  const actualEnd = end && end > start ? end : undefined

  return t('event.chipLabel', {
    title: title || t('event.untitled'),
    date: dateLabel(start, actualEnd, allDay, reading),
    time: allDay
      ? t('event.form.allDay')
      : timeLabel(start, actualEnd, reading),
    calendar: calendarName ?? '',
    status: statusLabel(partstat, t)
  })
}
