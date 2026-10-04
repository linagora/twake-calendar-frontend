import React, { useCallback, startTransition } from 'react'
import { CalendarApi, DateSelectArg } from '@fullcalendar/core'
import moment from 'moment-timezone'
import type { EventFormHandle } from '@common/components/Event/EventFormFields.types'
import { browserDefaultTimeZone } from '@common/utils/timezone'

interface UseCalendarPreviewSyncProps {
  formRef: React.RefObject<EventFormHandle | null>
  setSelectedRange: React.Dispatch<React.SetStateAction<DateSelectArg | null>>
  calendarRef: React.RefObject<CalendarApi | null>
}

/**
 * Helper to sync FullCalendar selection with a timeout to avoid collision with React state updates.
 */
function syncCalendarSelection(
  calendarRef: React.RefObject<CalendarApi | null>,
  range: DateSelectArg
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

/**
 * Pure helper to calculate the new date range when toggling all-day mode.
 */
function calculateAllDayRange(
  prev: DateSelectArg | null,
  newAllDay: boolean,
  newStart: string,
  newEnd: string,
  timezone?: string
): DateSelectArg {
  const startStr = newAllDay ? newStart.split('T')[0] : newStart
  const endStr = newAllDay ? toExclusiveEndDay(newEnd) : newEnd

  return {
    ...prev,
    startStr,
    endStr,
    start: toInstant(newAllDay ? `${startStr}T00:00:00` : newStart, timezone),
    end: toInstant(newAllDay ? `${endStr}T00:00:00` : newEnd, timezone),
    allDay: newAllDay
  } as DateSelectArg
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
          const newRange = {
            ...prev,
            start: toInstant(newStart, values?.timezone),
            startStr: newStart,
            allDay: allday
          } as DateSelectArg
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
          const newRange = {
            ...prev,
            end: toInstant(newEnd, values?.timezone),
            endStr: newEnd,
            allDay: allday
          } as DateSelectArg
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
