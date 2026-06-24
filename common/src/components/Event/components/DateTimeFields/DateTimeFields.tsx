import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { Box } from '@linagora/twake-mui'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import classNames from 'classnames'
import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/fr'
import 'dayjs/locale/ru'
import 'dayjs/locale/vi'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import React, { useMemo } from 'react'
import { useI18n } from 'twake-i18n'
import {
  DateTimeErrors,
  DateTimeWarnings,
  ValidationResult
} from '@common/components/Event/utils/formValidation'
import { DateTimeError } from './DateTimeError'
import { DateTimeLayoutContent } from './DateTimeLayoutContent'
import { useDateTimeHandlers } from './useDateTimeHandlers'
import { useDateTimeLayout } from './useDateTimeLayout'
import { useDisplayFlags } from './useDisplayFlags'

dayjs.extend(customParseFormat)

export interface DateTimeFieldsProps {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allday: boolean
  showMore: boolean
  hasEndDateChanged: boolean
  showEndDate: boolean
  onToggleEndDate: () => void
  validation: ValidationResult
  onStartDateChange: (date: string) => void
  onStartTimeChange: (time: string) => void
  onEndDateChange: (date: string, time?: string) => void
  onEndTimeChange: (time: string) => void
}

/**
 * DateTimeFields component - orchestrates date/time layout variants.
 * Handles state, duration-preserving event handlers, and selects the
 * appropriate layout sub-component based on the current mode.
 */
export const DateTimeFields: React.FC<DateTimeFieldsProps> = ({
  startDate,
  startTime,
  endDate,
  endTime,
  allday,
  showMore,
  hasEndDateChanged,
  showEndDate,
  validation,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange
}) => {
  const { t, lang } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const {
    spansMultipleDays,
    shouldShowFullFieldsInNormal,
    showSingleDateField,
    shouldShowTimeFields
  } = useDisplayFlags({
    allday,
    hasEndDateChanged,
    startDate,
    endDate,
    showEndDate,
    isExpanded: showMore
  })

  const startDateLabel = showSingleDateField
    ? t('dateTimeFields.date')
    : t('dateTimeFields.startDate')

  const layoutMode = useDateTimeLayout({
    hasEndDateChanged,
    allday,
    spansMultipleDays,
    showMore,
    showEndDate
  })

  const {
    handleStartDateChange,
    handleStartTimeChange,
    handleEndDateChange,
    handleEndTimeChange
  } = useDateTimeHandlers({
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    onStartDateChange,
    onStartTimeChange,
    onEndDateChange,
    onEndTimeChange
  })

  const startDateValue = useMemo(
    () => toDayjs(startDate, undefined, lang),
    [startDate, lang]
  )
  const startTimeValue = useMemo(
    () => toDayjs(startTime, 'HH:mm', lang),
    [startTime, lang]
  )
  const endDateValue = useMemo(
    () => toDayjs(endDate, undefined, lang),
    [endDate, lang]
  )
  const endTimeValue = useMemo(
    () => toDayjs(endTime, 'HH:mm', lang),
    [endTime, lang]
  )

  const layoutErrors = useMemo(() => getLayoutErrors(validation), [validation])

  const showFullField = showMore || shouldShowFullFieldsInNormal
  const containerClassName = classNames('date-time-group', {
    'show-full-field': showFullField
  })

  return (
    <LocalizationProvider
      key={lang}
      dateAdapter={AdapterDayjs}
      adapterLocale={lang ?? 'en'}
      localeText={{
        okButtonLabel: t('common.ok'),
        cancelButtonLabel: t('common.cancel'),
        todayButtonLabel: t('menubar.today')
      }}
    >
      <Box
        sx={{ display: 'flex', flexDirection: 'column' }}
        className={containerClassName}
      >
        <DateTimeLayoutContent
          layoutMode={layoutMode}
          startDateValue={startDateValue}
          startTimeValue={startTimeValue}
          endDateValue={endDateValue}
          endTimeValue={endTimeValue}
          errors={layoutErrors}
          isMobile={isMobile}
          allday={allday}
          startDateLabel={startDateLabel}
          shouldShowTimeFields={shouldShowTimeFields}
          onStartDateChange={handleStartDateChange}
          onStartTimeChange={handleStartTimeChange}
          onEndDateChange={handleEndDateChange}
          onEndTimeChange={handleEndTimeChange}
        />
        <DateTimeError
          message={displayError(validation)}
          warning={displayAsWarning(validation)}
        />
      </Box>
    </LocalizationProvider>
  )
}

function displayAsWarning(validation: ValidationResult): boolean | undefined {
  const hasError =
    getSafe(validation, 'errors', 'date', 'start') ||
    getSafe(validation, 'errors', 'date', 'end') ||
    getSafe(validation, 'errors', 'time', 'start') ||
    getSafe(validation, 'errors', 'time', 'end')
  if (hasError) {
    return false
  }
  return (
    !!getSafe(validation, 'warnings', 'date', 'start') ||
    !!getSafe(validation, 'warnings', 'date', 'end')
  )
}

function displayError(validation: {
  errors: DateTimeErrors
  warnings: DateTimeWarnings
}): string {
  return (
    getSafe(validation, 'errors', 'date', 'start') ||
    getSafe(validation, 'errors', 'time', 'end') ||
    getSafe(validation, 'errors', 'date', 'end') ||
    getSafe(validation, 'errors', 'time', 'start') ||
    getSafe(validation, 'warnings', 'date', 'start') ||
    getSafe(validation, 'warnings', 'date', 'end')
  )
}

function toDayjs(
  value: string,
  format?: string,
  lang?: string
): dayjs.Dayjs | null {
  if (!value) return null
  const d = format ? dayjs(value, format) : dayjs(value)
  return lang ? d.locale(lang) : d
}

function getLayoutErrors(validation: ValidationResult): {
  date: { start: string; end: string }
  time: { start: string; end: string }
} {
  return {
    date: {
      start:
        getSafe(validation, 'errors', 'date', 'start') ||
        getSafe(validation, 'warnings', 'date', 'start'),
      end:
        getSafe(validation, 'errors', 'date', 'end') ||
        getSafe(validation, 'warnings', 'date', 'end')
    },
    time: {
      start: getSafe(validation, 'errors', 'time', 'start'),
      end: getSafe(validation, 'errors', 'time', 'end')
    }
  }
}

function getSafe(obj: unknown, ...keys: string[]): string {
  let curr: unknown = obj
  for (const key of keys) {
    if (curr && typeof curr === 'object') {
      curr = (curr as Record<string, unknown>)[key]
    } else {
      return ''
    }
  }
  return typeof curr === 'string' ? curr : ''
}
