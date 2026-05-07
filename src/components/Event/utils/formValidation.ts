import { combineDateTime, splitDateTime } from './dateTimeHelpers'

/**
 * Validation parameters for event form
 */
export interface ValidationParams {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allday: boolean
  showValidationErrors: boolean
  hasEndDateChanged?: boolean
  showMore?: boolean
}

/**
 * Validation result for event form
 */
export interface ValidationResult {
  isValid: boolean
  errors: DateTimeErrors
}

export interface DateTimeErrors {
  time: string
  date: string
}

/**
 * Validate event form fields
 * @param params - Validation parameters
 * @returns Validation result with errors
 */
export function validateEventForm(params: ValidationParams): ValidationResult {
  const {
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    showValidationErrors,
    hasEndDateChanged = false,
    showMore = false
  } = params

  let isDateTimeValid = true
  let timeError = ''
  let dateError = ''

  // Determine which fields are visible based on UI mode
  const showFullFields =
    showMore ||
    allday ||
    hasEndDateChanged ||
    (!showMore && !allday && startDate !== endDate)
  const showTimeOnly = !allday && !showFullFields

  // Validate start date
  if (!startDate || startDate.trim() === '') {
    isDateTimeValid = false
    timeError = 'event.validation.startRequired'
  }
  // Validate start date is not before today's beginning
  else if (
    (() => {
      const [y, m, d] = startDate.split('-').map(v => parseInt(v, 10))
      const startDay = new Date(y, m - 1, d)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return isNaN(startDay.getTime()) || startDay < today
    })()
  ) {
    isDateTimeValid = false
    dateError = 'event.validation.startDateInPast'
  }
  // Validate start time (if not all-day)
  else if (!allday && (!startTime || startTime.trim() === '')) {
    isDateTimeValid = false
    timeError = 'event.validation.startRequired'
  }
  // Validate end fields based on UI mode
  else if (showFullFields) {
    // 4 fields mode: validate both end date and end time
    if (!endDate || endDate.trim() === '') {
      isDateTimeValid = false
      timeError = 'event.validation.endRequired'
    } else if (!allday && (!endTime || endTime.trim() === '')) {
      isDateTimeValid = false
      timeError = 'event.validation.endRequired'
    } else {
      // Validate total datetime
      if (allday) {
        const toLocalDate = (ymd: string) => {
          const [y, m, d] = ymd.split('-').map(v => parseInt(v, 10))
          if (!y || !m || !d) return new Date(NaN)
          return new Date(y, m - 1, d)
        }

        const startOnly = toLocalDate(startDate)
        const endOnly = toLocalDate(endDate)

        if (isNaN(startOnly.getTime()) || isNaN(endOnly.getTime())) {
          isDateTimeValid = false
          timeError = 'event.validation.invalidDate'
        } else if (endOnly < startOnly) {
          isDateTimeValid = false
          timeError = 'event.validation.endAfterStart'
        }
      } else {
        const startDateTime = new Date(combineDateTime(startDate, startTime))
        const endDateTime = new Date(combineDateTime(endDate, endTime))

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          isDateTimeValid = false
          timeError = 'event.validation.invalidDateTime'
        } else if (endDateTime <= startDateTime) {
          isDateTimeValid = false
          timeError = 'event.validation.endAfterStart'
        }
      }
    }
  } else if (showTimeOnly) {
    // 3 fields mode: validate time only (end time > start time, same day)
    if (!endTime || endTime.trim() === '') {
      isDateTimeValid = false
      timeError = 'event.validation.endRequired'
    } else {
      // Compare times only (same day is assumed)
      const startTimeParts = startTime.split(':')
      const endTimeParts = endTime.split(':')
      if (startTimeParts.length === 2 && endTimeParts.length === 2) {
        const startMinutes =
          parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1])
        const endMinutes =
          parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1])
        if (endMinutes <= startMinutes) {
          isDateTimeValid = false
          timeError = 'event.validation.endAfterStart'
        }
      } else {
        isDateTimeValid = false
        timeError = 'event.validation.invalidTimeFormat'
      }
    }
  }

  const isValid = isDateTimeValid

  return {
    isValid,
    errors: {
      time: showValidationErrors ? timeError : '',
      date: showValidationErrors ? dateError : ''
    }
  }
}

/**
 * Convenience wrapper: validate an EventFormValues bag without needing to
 * split the datetime strings manually. Used by EventFormFields.isValid().
 */
export function validateEventFormValues(
  values: {
    start: string
    end: string
    allday: boolean
    hasEndDateChanged: boolean
  },
  showMore: boolean
): boolean {
  const { date: startDate, time: startTime } = splitDateTime(values.start)
  const { date: endDate, time: endTime } = splitDateTime(values.end)
  return validateEventForm({
    startDate,
    startTime,
    endDate,
    endTime,
    allday: values.allday,
    showValidationErrors: false,
    hasEndDateChanged: values.hasEndDateChanged,
    showMore
  }).isValid
}
