import React from 'react'
import { EventDisplayInfo } from '@fullcalendar/react'
import moment from 'moment-timezone'
import { Calendar } from '@common/types/CalendarTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { useI18n } from 'twake-i18n'
import { DesktopEventChipSchedule } from './DesktopEventChipSchedule'
import { MobileEventChipSchedule } from './MobileEventChipSchedule'
import { getEventInstanceKey, getFirstRowByDay } from './scheduleFirstRows'

export interface EventChipScheduleProps {
  arg: EventDisplayInfo
  calendars: Record<string, Calendar>
  tempcalendars: Record<string, Calendar>
  timezone: string
  upcommingEventId?: string
}

const getEffectiveDayMoment = (
  arg: EventDisplayInfo,
  timezone: string
): moment.Moment => {
  if (arg.isStart || !arg.event.end) {
    return moment(arg.event.start).tz(timezone)
  }
  if (arg.isEnd) {
    // The end is exclusive: an all-day event ending on the 8th lasts until the 7th
    return moment(arg.event.end).tz(timezone).subtract(1, 'millisecond')
  }
  return moment(arg.event.start).tz(timezone).add(1, 'day')
}

const buildListDayData = (
  arg: EventDisplayInfo,
  timezone: string,
  locale: string
): {
  isFirstRow: boolean
  isToday: boolean
  isInPast: boolean
  dayNum: string
  dayName: string
} => {
  const effectiveDayMoment = getEffectiveDayMoment(arg, timezone)
  const dayKey = effectiveDayMoment.format('YYYY-MM-DD')

  const isFirstRow =
    getFirstRowByDay(arg.view.calendar, timezone).get(dayKey) ===
    getEventInstanceKey(arg.event)

  const now = moment().tz(timezone)
  const isToday = effectiveDayMoment.isSame(now, 'day')
  const isInPast = effectiveDayMoment.isBefore(now, 'day')

  return {
    isFirstRow,
    isToday,
    isInPast,
    dayNum: effectiveDayMoment.format('D'),
    dayName: effectiveDayMoment.toDate().toLocaleDateString(locale, {
      weekday: 'short',
      timeZone: timezone
    })
  }
}

export const EventChipSchedule: React.FC<EventChipScheduleProps> = ({
  arg,
  calendars,
  tempcalendars,
  timezone,
  upcommingEventId
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const dayData = buildListDayData(arg, timezone, t('locale'))

  return isMobile ? (
    <MobileEventChipSchedule
      arg={arg}
      calendars={calendars}
      tempcalendars={tempcalendars}
      timezone={timezone}
      dayData={dayData}
      upcommingEventId={upcommingEventId}
    />
  ) : (
    <DesktopEventChipSchedule
      arg={arg}
      calendars={calendars}
      tempcalendars={tempcalendars}
      timezone={timezone}
      dayData={dayData}
      upcommingEventId={upcommingEventId}
    />
  )
}
