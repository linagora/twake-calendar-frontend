import { RepetitionObject } from '@common/types/Repetition'

export interface TimezoneListResult {
  zones: string[]
  browserTz: string
  getTimezoneOffset: (tzName: string, date: Date) => string
}

export interface EventDateTimeFieldProps {
  /** Controlled start value (ISO or YYYY-MM-DD) */
  start: string
  setStart: (value: string) => void
  /** Controlled end value */
  end: string
  setEnd: (value: string) => void
  /** All-day flag */
  allday: boolean
  setAllDay: (value: boolean) => void
  /** Current timezone name */
  timezone: string
  setTimezone: (value: string) => void
  /** Repetition rule */
  repetition: RepetitionObject
  setRepetition: (value: RepetitionObject) => void
  showRepeat: boolean
  setShowRepeat: (value: boolean) => void
  /** Whether the full (expanded) dialog mode is active */
  showMore: boolean
  /** show/hide validation error messages */
  timezoneList: TimezoneListResult
  typeOfAction?: 'solo' | 'all'
  /** Optional callbacks for calendar preview sync (EventModal only) */
  onStartChange?: (newStart: string) => void
  onEndChange?: (newEnd: string) => void
  onAllDayChange?: (
    newAllDay: boolean,
    newStart: string,
    newEnd: string
  ) => void
  onHasEndDateChangedChange?: (has: boolean) => void
  /** Notify parent when the validation state changes */
  onValidationChange?: (isValid: boolean) => void
}
