import { PickerValue } from '@mui/x-date-pickers/internals'
import { Dayjs } from 'dayjs'
import React from 'react'
import { dtDate, dtTime, toDateTime } from '../../utils/dateTimeHelpers'

type DurationUnit = 'day' | 'minute'

export interface DateTimeHandlersProps {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allday: boolean
  onStartDateChange: (date: string) => void
  onStartTimeChange: (time: string) => void
  onEndDateChange: (date: string, time?: string) => void
  onEndTimeChange: (time: string) => void
}

function applyDateTimeUpdate({
  newDate,
  newTime,
  currentDate,
  currentTime,
  onDateChange,
  onTimeChange
}: {
  newDate: string
  newTime: string
  currentDate: string
  currentTime: string
  onDateChange: (date: string) => void
  onTimeChange?: (time: string) => void
}): void {
  if (newDate !== currentDate) onDateChange(newDate)
  if (onTimeChange && newTime !== currentTime) onTimeChange(newTime)
}

export function useDateTimeHandlers(props: DateTimeHandlersProps): {
  handleStartDateChange: (value: PickerValue) => void
  handleStartTimeChange: (value: PickerValue) => void
  handleEndDateChange: (value: PickerValue) => void
  handleEndTimeChange: (value: PickerValue) => void
} {
  const {
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    onStartDateChange,
    onStartTimeChange,
    onEndDateChange,
    onEndTimeChange
  } = props

  const initialDurationRef = React.useRef<number | null>(null)
  const isUserActionRef = React.useRef(false)

  const durationUnit: DurationUnit = allday ? 'day' : 'minute'

  const getCurrentDuration = React.useCallback((): number => {
    const start = toDateTime(startDate, startTime)
    const end = toDateTime(endDate, endTime)
    const duration = allday
      ? end.startOf('day').diff(start.startOf('day'), 'day')
      : end.diff(start, 'minute')
    return Math.max(duration, 0)
  }, [startDate, startTime, endDate, endTime, allday])

  React.useEffect(() => {
    const isExternalUpdate = !isUserActionRef.current
    const hasBothDates = startDate && endDate
    if (isExternalUpdate && hasBothDates) {
      initialDurationRef.current = getCurrentDuration()
    }
    queueMicrotask(() => {
      isUserActionRef.current = false
    })
  }, [startDate, endDate, startTime, endTime, getCurrentDuration])

  const handleStartDateChange = (value: PickerValue): void => {
    if (!value?.isValid()) return

    isUserActionRef.current = true
    const newDateStr = dtDate(value as Dayjs)
    const duration = initialDurationRef.current ?? getCurrentDuration()

    onStartDateChange(newDateStr)

    const newStart = toDateTime(newDateStr, startTime)
    const newEnd = newStart.add(duration, durationUnit)

    applyDateTimeUpdate({
      newDate: dtDate(newEnd),
      newTime: dtTime(newEnd),
      currentDate: endDate,
      currentTime: endTime,
      onDateChange: onEndDateChange,
      onTimeChange: allday ? undefined : onEndTimeChange
    })
  }

  const handleStartTimeChange = (value: PickerValue): void => {
    if (!value?.isValid()) return

    isUserActionRef.current = true
    const newTimeStr = dtTime(value as Dayjs)
    const duration = initialDurationRef.current ?? getCurrentDuration()

    onStartTimeChange(newTimeStr)

    const newStart = toDateTime(startDate, newTimeStr)
    const newEnd = newStart.add(duration, 'minute')

    const newEndDate = dtDate(newEnd)
    const newEndTime = dtTime(newEnd)
    const hasDateChanged = newEndDate !== endDate
    const hasTimeChanged = newEndTime !== endTime

    if (hasDateChanged && hasTimeChanged) {
      onEndDateChange(newEndDate, newEndTime)
      return
    }
    if (hasDateChanged) onEndDateChange(newEndDate)
    if (!allday && hasTimeChanged) onEndTimeChange(newEndTime)
  }

  const handleEndDateChange = (value: PickerValue): void => {
    if (!value?.isValid()) return

    isUserActionRef.current = true
    const newDateStr = dtDate(value as Dayjs)
    const newEnd = toDateTime(newDateStr, endTime)
    const currentStart = toDateTime(startDate, startTime)

    if (!newEnd.isBefore(currentStart)) {
      initialDurationRef.current = newEnd.diff(currentStart, durationUnit)
      onEndDateChange(newDateStr)
      return
    }

    const duration = initialDurationRef.current ?? getCurrentDuration()
    const newStart = newEnd.subtract(duration, durationUnit)

    applyDateTimeUpdate({
      newDate: dtDate(newStart),
      newTime: dtTime(newStart),
      currentDate: startDate,
      currentTime: startTime,
      onDateChange: onStartDateChange,
      onTimeChange: allday ? undefined : onStartTimeChange
    })

    onEndDateChange(newDateStr)
  }

  const handleEndTimeChange = (value: PickerValue): void => {
    if (!value?.isValid()) return

    isUserActionRef.current = true
    const newTimeStr = dtTime(value as Dayjs)
    const newEnd = toDateTime(endDate, newTimeStr)
    const currentStart = toDateTime(startDate, startTime)

    initialDurationRef.current = newEnd.diff(currentStart, 'minute')
    onEndTimeChange(newTimeStr)
  }

  return {
    handleStartDateChange,
    handleStartTimeChange,
    handleEndDateChange,
    handleEndTimeChange
  }
}
