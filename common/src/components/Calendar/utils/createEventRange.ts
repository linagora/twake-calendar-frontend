import { DateSelectArg } from '@fullcalendar/core'
import moment from 'moment-timezone'
import { CALENDAR_VIEWS } from './constants'

export function buildCreateEventRange(
  currentView: string,
  displayedDate: Date | undefined,
  timezone: string,
  now: Date = new Date(),
  workingDays?: number[],
  displayedEnd?: Date
): DateSelectArg | null {
  if (!displayedDate || !Object.values(CALENDAR_VIEWS).includes(currentView)) {
    return null
  }

  const firstDay = moment.tz(displayedDate, timezone).startOf('day')
  const isMonth =
    currentView === CALENDAR_VIEWS.dayGridMonth ||
    currentView === CALENDAR_VIEWS.listMonth
  const periodEnd = firstDay
    .clone()
    .add(
      isMonth || currentView === CALENDAR_VIEWS.timeGridDay ? 1 : 7,
      isMonth ? 'month' : 'day'
    )
  const end = displayedEnd ? moment.tz(displayedEnd, timezone) : periodEnd
  const nowInZone = moment.tz(now, timezone)
  if (nowInZone.isSameOrAfter(firstDay) && nowInZone.isBefore(end)) {
    return null
  }

  const day = firstDay.clone()
  if (currentView !== CALENDAR_VIEWS.timeGridDay && workingDays?.length) {
    while (day.isBefore(end) && !workingDays.includes(day.day())) {
      day.add(1, 'day')
    }
    if (!day.isBefore(end)) day.set(firstDay.toObject())
  }
  const displayedDay = day.format('YYYY-MM-DD')
  const nextHour = nowInZone.clone().add(1, 'hour').startOf('hour')
  const start = moment.tz(
    `${displayedDay}T${nextHour.format('HH:mm')}`,
    timezone
  )
  const eventEnd = start.clone().add(1, 'hour')

  return {
    start: start.toDate(),
    end: eventEnd.toDate(),
    startStr: start.format(),
    endStr: eventEnd.format(),
    allDay: false
  } as DateSelectArg
}
