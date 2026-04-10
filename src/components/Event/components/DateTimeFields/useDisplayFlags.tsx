import { useMemo } from 'react'

export interface DisplayFlagsProps {
  allday: boolean
  hasEndDateChanged: boolean
  startDate: string
  endDate: string
  showEndDate: boolean
  isExpanded: boolean
}

export function useDisplayFlags({
  allday,
  hasEndDateChanged,
  startDate,
  endDate,
  showEndDate,
  isExpanded
}: DisplayFlagsProps): {
  spansMultipleDays: boolean
  shouldShowFullFieldsInNormal: boolean
  showSingleDateField: boolean
  shouldShowTimeFields: boolean
} {
  const spansMultipleDays = useMemo(
    () => startDate !== endDate,
    [startDate, endDate]
  )
  const isTimedEvent = useMemo(() => !allday, [allday])
  const shouldShowEndDateNormal = useMemo(
    () => allday || showEndDate,
    [allday, showEndDate]
  )
  const shouldShowFullFieldsInNormal = useMemo(
    () => hasEndDateChanged || (spansMultipleDays && isTimedEvent),
    [hasEndDateChanged, spansMultipleDays, isTimedEvent]
  )
  const showSingleDateField = useMemo(
    () =>
      !isExpanded && !shouldShowEndDateNormal && !shouldShowFullFieldsInNormal,
    [isExpanded, shouldShowEndDateNormal, shouldShowFullFieldsInNormal]
  )
  const shouldShowTimeFields = useMemo(
    () => isTimedEvent || shouldShowFullFieldsInNormal,
    [isTimedEvent, shouldShowFullFieldsInNormal]
  )

  return {
    spansMultipleDays,
    shouldShowFullFieldsInNormal,
    showSingleDateField,
    shouldShowTimeFields
  }
}
