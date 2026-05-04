import { useEffect } from 'react'
import { combineDateTime } from '../utils/dateTimeHelpers'

interface UseAutoEndTimeParams {
  startTime: string
  endTime: string
  allday: boolean
  startDate: string
  endDate: string
  setEndTime: (value: string) => void
  onEndChange?: (newEnd: string) => void
  setEnd: (value: string) => void
}

/**
 * Auto-calculates end time as startTime + 1 hour when endTime is not yet set.
 * Extracted from useDateTimeSplit to keep each hook under the CC threshold.
 */
export function useAutoEndTime({
  startTime,
  endTime,
  allday,
  startDate,
  endDate,
  setEndTime,
  onEndChange,
  setEnd
}: UseAutoEndTimeParams): void {
  useEffect(() => {
    const needsAutoEnd = Boolean(startTime) && !endTime && !allday
    if (!needsAutoEnd) return
    const [hours, minutes] = startTime.split(':')
    const endHour = (parseInt(hours) + 1) % 24
    const calculatedEndTime = `${endHour.toString().padStart(2, '0')}:${minutes}`
    setEndTime(calculatedEndTime)
    const newEnd = combineDateTime(endDate || startDate, calculatedEndTime)
    setEnd(newEnd)
    if (onEndChange) {
      onEndChange(newEnd)
    }
  }, [
    startTime,
    endTime,
    allday,
    endDate,
    startDate,
    onEndChange,
    setEnd,
    setEndTime
  ])
}
