import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import moment from 'moment'

export function formatDateToYYYYMMDDTHHMMSS(date: Date) {
  return moment(date).format('YYYYMMDDTHHmmss')
}

// FullCalendar's month view always renders six weeks (fixedWeekCount)
const MONTH_GRID_WEEKS = 6

export function getCalendarRange(date = new Date()) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const dayOfWeekStart = firstOfMonth.getDay()
  const diffToMonday = (dayOfWeekStart + 6) % 7
  const startDate = new Date(firstOfMonth)
  startDate.setDate(firstOfMonth.getDate() - diffToMonday)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + MONTH_GRID_WEEKS * 7 - 1)
  endDate.setHours(23, 59, 59, 999)

  return {
    start: startDate,
    end: endDate
  }
}

export function getDeltaInMilliseconds(delta: {
  years: number
  months: number
  days: number
  milliseconds: number
}) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const AVG_MS_PER_MONTH = 30.44 * MS_PER_DAY
  const AVG_MS_PER_YEAR = 365.25 * MS_PER_DAY

  return (
    (delta.years || 0) * AVG_MS_PER_YEAR +
    (delta.months || 0) * AVG_MS_PER_MONTH +
    (delta.days || 0) * MS_PER_DAY +
    (delta.milliseconds || 0)
  )
}

export const computeStartOfTheWeek = (date: Date): Date => {
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - ((date.getDay() + 6) % 7)) // Monday
  startOfWeek.setHours(0, 0, 0, 0)
  return startOfWeek
}

export const computeWeekRange = (date: Date): { start: Date; end: Date } => {
  const weekStart = computeStartOfTheWeek(date)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  return { start: weekStart, end: weekEnd }
}

export function getViewRange(
  date = new Date(),
  view: string
): { start: Date; end: Date } {
  if (view === CALENDAR_VIEWS.dayGridMonth) {
    return getCalendarRange(date)
  }
  return computeWeekRange(date)
}

export function getAdjacentWeekRange(date = new Date()): {
  start: Date
  end: Date
} {
  const nextWeekDate = new Date(date)
  nextWeekDate.setDate(date.getDate() + 7)

  return computeWeekRange(nextWeekDate)
}

export function getTwoWeekRange(date = new Date()): { start: Date; end: Date } {
  const start = computeStartOfTheWeek(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 14)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}
