import React, { useCallback, startTransition } from 'react'
import { CalendarApi, DateSelectArg } from '@fullcalendar/core'
import type { EventFormHandle } from '../EventFormFields.types'

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
 * Pure helper to calculate the new date range when toggling all-day mode.
 */
function calculateAllDayRange(
  prev: DateSelectArg | null,
  newAllDay: boolean,
  newStart: string,
  newEnd: string
): DateSelectArg {
  const startStr = newAllDay ? newStart.split('T')[0] : newStart
  const endStr = newAllDay ? newEnd.split('T')[0] : newEnd

  return {
    ...prev,
    startStr,
    endStr,
    start: new Date(newAllDay ? `${startStr}T00:00:00` : newStart),
    end: new Date(newAllDay ? `${endStr}T00:00:00` : newEnd),
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
      const allday = formRef.current?.getValues().allday ?? false
      startTransition(() => {
        setSelectedRange(prev => {
          const newRange = {
            ...prev,
            start: new Date(newStart),
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
      const allday = formRef.current?.getValues().allday ?? false
      startTransition(() => {
        setSelectedRange(prev => {
          const newRange = {
            ...prev,
            end: new Date(newEnd),
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
      startTransition(() => {
        setSelectedRange(prev => {
          const newRange = calculateAllDayRange(
            prev,
            newAllDay,
            newStart,
            newEnd
          )
          syncCalendarSelection(calendarRef, newRange)
          return newRange
        })
      })
    },
    [setSelectedRange, calendarRef]
  )

  return {
    handleStartChange,
    handleEndChange,
    handleAllDayChange
  }
}
