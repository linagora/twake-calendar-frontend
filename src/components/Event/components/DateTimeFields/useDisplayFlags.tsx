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
  return useMemo(() => {
    const spansMultipleDays = startDate !== endDate
    const isTimedEvent = !allday
    const shouldShowEndDateNormal = allday || showEndDate
    const shouldShowFullFieldsInNormal =
      hasEndDateChanged || (spansMultipleDays && isTimedEvent)
    const showSingleDateField =
      !isExpanded && !shouldShowEndDateNormal && !shouldShowFullFieldsInNormal
    const shouldShowTimeFields = isTimedEvent || shouldShowFullFieldsInNormal

    return {
      spansMultipleDays,
      shouldShowFullFieldsInNormal,
      showSingleDateField,
      shouldShowTimeFields
    }
  }, [allday, hasEndDateChanged, startDate, endDate, showEndDate, isExpanded])
}
