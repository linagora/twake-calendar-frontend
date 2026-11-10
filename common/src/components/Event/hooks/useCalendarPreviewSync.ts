import React, { useCallback, startTransition } from 'react'
import { CalendarApi, DateSelectInfo } from '@fullcalendar/react'
import moment from 'moment-timezone'
import type { EventFormHandle } from '@common/components/Event/EventFormFields.types'
import { browserDefaultTimeZone } from '@common/utils/timezone'

interface UseCalendarPreviewSyncProps {
  formRef: React.RefObject<EventFormHandle | null>
  setSelectedRange: React.Dispatch<React.SetStateAction<DateSelectInfo | null>>
  calendarRef: React.RefObject<CalendarApi | null>
}

/**
 * Helper to sync FullCalendar selection with a timeout to avoid collision with React state updates.
 */
function syncCalendarSelection(
  calendarRef: React.RefObject<CalendarApi | null>,
  range: DateSelectInfo
): void {
  setTimeout(() => {
    calendarRef.current?.select(range)
  }, 0)
}

/**
 * The form holds wall clock times in the zone of the event, without offset.
 * Reading them with `new Date()` would place them in the zone of the browser,
 * and the grid would highlight a slot shifted by the gap between both zones.
 */
function toInstant(wallClock: string, timezone?: string): Date {
  return moment.tz(wallClock, timezone || browserDefaultTimeZone).toDate()
}

/**
 * The form holds an inclusive end day while FullCalendar expects an exclusive
 * one: a one day event ending on its start day would be an empty range.
 */
function toExclusiveEndDay(inclusiveEnd: string): string {
  return moment(inclusiveEnd.split('T')[0], 'YYYY-MM-DD')
    .add(1, 'day')
    .format('YYYY-MM-DD')
}

interface RangeBound {
  str: string
  date: Date
}

/**
 * An all day preview starts at the midnight opening its first day.
 */
function startBound(
  start: string,
  allDay: boolean,
  timezone?: string
): RangeBound {
  const str = allDay ? start.split('T')[0] : start
  return {
    str,
    date: toInstant(allDay ? `${str}T00:00:00` : start, timezone)
  }
}

/**
 * An all day preview ends at the midnight closing its last day, whether all
 * day was ticked before or after the end was edited.
 */
function endBound(end: string, allDay: boolean, timezone?: string): RangeBound {
  const str = allDay ? toExclusiveEndDay(end) : end
  return {
    str,
    date: toInstant(allDay ? `${str}T00:00:00` : end, timezone)
  }
}

/**
 * Pure helper to calculate the new date range when toggling all-day mode.
 */
function calculateAllDayRange(
  prev: DateSelectInfo | null,
  newAllDay: boolean,
  newStart: string,
  newEnd: string,
  timezone?: string
): DateSelectInfo {
  const start = startBound(newStart, newAllDay, timezone)
  const end = endBound(newEnd, newAllDay, timezone)

  return {
    ...prev,
    startStr: start.str,
    endStr: end.str,
    start: start.date,
    end: end.date,
    allDay: newAllDay
  } as DateSelectInfo
}

export interface UseCalendarPreviewSyncReturn {
  handleStartChange: (newStart: string) => void
  handleEndChange: (newEnd: string) => void
  handleAllDayChange: (
    newAllDay: boolean,
    newStart: string,
    newEnd: string
  ) => void
}

export function useCalendarPreviewSync({
  formRef,
  setSelectedRange,
  calendarRef
}: UseCalendarPreviewSyncProps): UseCalendarPreviewSyncReturn {
  const handleStartChange = useCallback(
    (newStart: string) => {
      const values = formRef.current?.getValues()
      const allday = values?.allday ?? false
      startTransition(() => {
        setSelectedRange(prev => {
          const start = startBound(newStart, allday, values?.timezone)
          const newRange = {
            ...prev,
            start: start.date,
            startStr: start.str,
            allDay: allday
          } as DateSelectInfo
          syncCalendarSelection(calendarRef, newRange)
          return newRange
        })
      })
    },
    [formRef, setSelectedRange, calendarRef]
  )

  const handleEndChange = useCallback(
    (newEnd: string) => {
      const values = formRef.current?.getValues()
      const allday = values?.allday ?? false
      startTransition(() => {
        setSelectedRange(prev => {
          const end = endBound(newEnd, allday, values?.timezone)
          const newRange = {
            ...prev,
            end: end.date,
            endStr: end.str,
            allDay: allday
          } as DateSelectInfo
          syncCalendarSelection(calendarRef, newRange)
          return newRange
        })
      })
    },
    [formRef, setSelectedRange, calendarRef]
  )

  const handleAllDayChange = useCallback(
    (newAllDay: boolean, newStart: string, newEnd: string) => {
      const timezone = formRef.current?.getValues().timezone
      startTransition(() => {
        setSelectedRange(prev => {
          const newRange = calculateAllDayRange(
            prev,
            newAllDay,
            newStart,
            newEnd,
            timezone
          )
          syncCalendarSelection(calendarRef, newRange)
          return newRange
        })
      })
    },
    [formRef, setSelectedRange, calendarRef]
  )

  return {
    handleStartChange,
    handleEndChange,
    handleAllDayChange
  }
}
