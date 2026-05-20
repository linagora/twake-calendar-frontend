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
  hasEndDateChanged?: boolean
  showMore?: boolean
}

/**
 * Validation result for event form
 */
export interface ValidationResult {
  isValid: boolean
  errors: DateTimeErrors
  warnings: DateTimeWarnings
}

export interface DateTimeErrors {
  date: { start: string; end: string }
  time: { start: string; end: string }
}

export interface DateTimeWarnings {
  date: { start: string; end?: string }
}

function validateStartDate(startDate: string): {
  error: string
  warning: string
} {
  if (!startDate || startDate.trim() === '') {
    return { error: 'event.validation.startRequired', warning: '' }
  }
  if (isDateInPast(startDate)) {
    return { error: '', warning: 'event.validation.startDateInPast' }
  }
  return { error: '', warning: '' }
}

function validateStartTime(
  startTime: string,
  allday: boolean
): {
  error: string
} {
  if (!allday && (!startTime || startTime.trim() === '')) {
    return { error: 'event.validation.startRequired' }
  }
  return { error: '' }
}

function validateEndDateTime(
  params: Pick<
    ValidationParams,
    | 'startDate'
    | 'startTime'
    | 'endDate'
    | 'endTime'
    | 'allday'
    | 'hasEndDateChanged'
    | 'showMore'
  >
): { errors: Partial<DateTimeErrors>; isValid: boolean } {
  const {
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    hasEndDateChanged = false,
    showMore = false
  } = params

  const showFullFields =
    showMore ||
    allday ||
    hasEndDateChanged ||
    (!showMore && !allday && startDate !== endDate)
  const showTimeOnly = !allday && !showFullFields

  if (showFullFields)
    return validateFullFields({
      startDate,
      startTime,
      endDate,
      endTime,
      allday
    })
  if (showTimeOnly) return validateTimeOnlyFields(startTime, endTime)
  return {
    isValid: true,
    errors: { date: { start: '', end: '' }, time: { start: '', end: '' } }
  }
}

export function validateEventForm(params: ValidationParams): ValidationResult {
  const {
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    hasEndDateChanged,
    showMore
  } = params

  const startDateResult = validateStartDate(startDate)
  const startTimeResult = validateStartTime(startTime, allday)
  const allFieldsResult = validateEndDateTime({
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    hasEndDateChanged,
    showMore
  })

  const isValid =
    !startDateResult.error && !startTimeResult.error && allFieldsResult.isValid

  return {
    isValid,
    errors: {
      date: {
        start:
          startDateResult.error || allFieldsResult.errors.date?.start || '',
        end: allFieldsResult.errors.date?.end || ''
      },
      time: {
        start:
          startTimeResult.error || allFieldsResult.errors.time?.start || '',
        end: allFieldsResult.errors.time?.end || ''
      }
    },
    warnings: {
      date: {
        start: startDateResult.warning
      }
    }
  }
}

export function isDateInPast(startDate: string): boolean {
  if (!startDate) return false
  const [y, m, d] = startDate.split('-').map(v => parseInt(v, 10))
  const startDay = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return !isNaN(startDay.getTime()) && startDay < today
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
    hasEndDateChanged: values.hasEndDateChanged,
    showMore
  }).isValid
}

function validateAlldayRange(
  startDate: string,
  endDate: string
): { valid: boolean; dateStartError: string; dateEndError: string } {
  const toLocalDate = (ymd: string): Date => {
    const [y, m, d] = ymd.split('-').map(v => parseInt(v, 10))
    return y && m && d ? new Date(y, m - 1, d) : new Date(NaN)
  }

  const start = toLocalDate(startDate)
  const end = toLocalDate(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      valid: false,
      dateStartError: 'event.validation.invalidDate',
      dateEndError: 'event.validation.invalidDate'
    }
  }
  if (end < start) {
    return {
      valid: false,
      dateStartError: '',
      dateEndError: 'event.validation.endAfterStart'
    }
  }
  return { valid: true, dateStartError: '', dateEndError: '' }
}

function validateTimeOnlyRange(
  startTime: string,
  endTime: string
): { valid: boolean; timeStartError: string; timeEndError: string } {
  const parts = (t: string) => t.split(':').map(Number)
  const [sh, sm] = parts(startTime)
  const [eh, em] = parts(endTime)

  if ([sh, sm, eh, em].some(isNaN)) {
    return {
      valid: false,
      timeStartError: 'event.validation.invalidTimeFormat',
      timeEndError: 'event.validation.invalidTimeFormat'
    }
  }
  if (eh * 60 + em <= sh * 60 + sm) {
    return {
      valid: false,
      timeStartError: '',
      timeEndError: 'event.validation.endAfterStart'
    }
  }
  return { valid: true, timeStartError: '', timeEndError: '' }
}

function validateDateTimeRange(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): { valid: boolean; timeStartError: string; timeEndError: string } {
  const start = new Date(combineDateTime(startDate, startTime))
  const end = new Date(combineDateTime(endDate, endTime))

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      valid: false,
      timeStartError: 'event.validation.invalidDate',
      timeEndError: 'event.validation.invalidDate'
    }
  }
  if (end <= start) {
    return {
      valid: false,
      timeStartError: '',
      timeEndError: 'event.validation.endAfterStart'
    }
  }
  return { valid: true, timeStartError: '', timeEndError: '' }
}

function validateFullFields(
  params: Pick<
    ValidationParams,
    'startDate' | 'startTime' | 'endDate' | 'endTime' | 'allday'
  >
): { isValid: boolean; errors: Partial<DateTimeErrors> } {
  const { startDate, startTime, endDate, endTime, allday } = params

  if (!endDate?.trim()) {
    return {
      isValid: false,
      errors: { time: { start: '', end: 'event.validation.endRequired' } }
    }
  }
  if (!allday && !endTime?.trim()) {
    return {
      isValid: false,
      errors: { time: { start: '', end: 'event.validation.endRequired' } }
    }
  }

  if (allday) {
    const { valid, dateStartError, dateEndError } = validateAlldayRange(
      startDate,
      endDate
    )
    return {
      isValid: valid,
      errors: { date: { start: dateStartError, end: dateEndError } }
    }
  }

  const { valid, timeStartError, timeEndError } = validateDateTimeRange(
    startDate,
    startTime,
    endDate,
    endTime
  )
  return {
    isValid: valid,
    errors: { time: { start: timeStartError, end: timeEndError } }
  }
}

function validateTimeOnlyFields(
  startTime: string,
  endTime: string
): { isValid: boolean; errors: Partial<DateTimeErrors> } {
  if (!endTime?.trim()) {
    return {
      isValid: false,
      errors: { time: { start: '', end: 'event.validation.endRequired' } }
    }
  }
  const { valid, timeStartError, timeEndError } = validateTimeOnlyRange(
    startTime,
    endTime
  )
  return {
    isValid: valid,
    errors: { time: { start: timeStartError, end: timeEndError } }
  }
}
