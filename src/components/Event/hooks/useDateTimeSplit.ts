import { useEffect, useState } from 'react'
import { splitDateTime } from '../utils/dateTimeHelpers'
import { validateEventForm } from '../utils/formValidation'
import { useAutoEndTime } from './useAutoEndTime'

interface UseDateTimeSplitParams {
  start: string
  end: string
  allday: boolean
  showMore: boolean
  hasEndDateChanged: boolean
  setHasEndDateChanged: (value: boolean) => void
  onEndChange?: (newEnd: string) => void
  setEnd: (value: string) => void
  onHasEndDateChangedChange?: (has: boolean) => void
  onValidationChange?: (isValid: boolean) => void
}

interface UseDateTimeSplitResult {
  startDate: string
  setStartDate: (value: string) => void
  startTime: string
  setStartTime: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  endTime: string
  setEndTime: (value: string) => void
}

const changeDateAndTime = (
  datetime: string,
  setDate: (date: string) => void,
  setTime: (time: string) => void
): void => {
  if (!datetime) return

  const { date, time } = splitDateTime(datetime)
  setDate(date)
  setTime(time)
}

export function useDateTimeSplit({
  start,
  end,
  allday,
  showMore,
  hasEndDateChanged,
  setHasEndDateChanged,
  onEndChange,
  setEnd,
  onHasEndDateChangedChange,
  onValidationChange
}: UseDateTimeSplitParams): UseDateTimeSplitResult {
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')

  // Sync split fields from parent ISO strings
  useEffect(() => {
    changeDateAndTime(start, setStartDate, setStartTime)
  }, [start])

  useEffect(() => {
    changeDateAndTime(end, setEndDate, setEndTime)
  }, [end])

  // Notify parent about validation
  const isValid = validateEventForm({
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    hasEndDateChanged,
    showMore
  }).isValid

  useEffect(() => {
    onValidationChange?.(isValid)
  }, [isValid, onValidationChange])

  // Notify parent when end-date-changed flag changes
  useEffect(() => {
    onHasEndDateChangedChange?.(hasEndDateChanged)
  }, [hasEndDateChanged, onHasEndDateChangedChange])

  // Reset end-date-changed when dates fall back to same day in normal mode
  useEffect(() => {
    const shouldReset =
      !showMore &&
      hasEndDateChanged &&
      Boolean(startDate) &&
      startDate === endDate
    if (shouldReset) setHasEndDateChanged(false)
  }, [showMore, hasEndDateChanged, startDate, endDate, setHasEndDateChanged])

  // Auto end-time calculation delegated to its own hook
  useAutoEndTime({
    startTime,
    endTime,
    allday,
    startDate,
    endDate,
    setEndTime,
    onEndChange,
    setEnd
  })

  return {
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime
  }
}
