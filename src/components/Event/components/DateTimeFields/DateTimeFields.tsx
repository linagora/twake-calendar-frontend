import { Box, useMediaQuery, useTheme } from '@linagora/twake-mui'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/fr'
import 'dayjs/locale/ru'
import 'dayjs/locale/vi'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import React, { useMemo } from 'react'
import { useI18n } from 'twake-i18n'
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
  validation: {
    errors: {
      dateTime: string
    }
  }
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

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
    () => (startDate ? dayjs(startDate) : null),
    [startDate]
  )
  const startTimeValue = useMemo(
    () => (startTime ? dayjs(startTime, 'HH:mm') : null),
    [startTime]
  )
  const endDateValue = useMemo(
    () => (endDate ? dayjs(endDate) : null),
    [endDate]
  )
  const endTimeValue = useMemo(
    () => (endTime ? dayjs(endTime, 'HH:mm') : null),
    [endTime]
  )

  const hasError = !!validation.errors.dateTime

  const showFullField = showMore || shouldShowFullFieldsInNormal
  const containerClassName = [
    'date-time-group',
    showFullField ? 'show-full-field' : ''
  ]
    .filter(Boolean)
    .join(' ')

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
      <Box display="flex" flexDirection="column" className={containerClassName}>
        <DateTimeLayoutContent
          layoutMode={layoutMode}
          startDateValue={startDateValue}
          startTimeValue={startTimeValue}
          endDateValue={endDateValue}
          endTimeValue={endTimeValue}
          hasError={hasError}
          isMobile={isMobile}
          allday={allday}
          startDateLabel={startDateLabel}
          shouldShowTimeFields={shouldShowTimeFields}
          onStartDateChange={handleStartDateChange}
          onStartTimeChange={handleStartTimeChange}
          onEndDateChange={handleEndDateChange}
          onEndTimeChange={handleEndTimeChange}
        />
        <DateTimeError message={validation.errors.dateTime} />
      </Box>
    </LocalizationProvider>
  )
}
