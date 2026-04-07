import { Box } from '@linagora/twake-mui'
import { PickerValue } from '@mui/x-date-pickers/internals'
import dayjs from 'dayjs'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { DatePickerField } from './DatePickerField'
import { TimePickerField } from './TimePickerField'

export interface ExpandedDateTimeLayoutProps {
  startDateValue: ReturnType<typeof dayjs> | null
  startTimeValue: ReturnType<typeof dayjs> | null
  endDateValue: ReturnType<typeof dayjs> | null
  endTimeValue: ReturnType<typeof dayjs> | null
  hasError: boolean
  isMobile: boolean
  shouldShowTimeFields: boolean
  onStartDateChange: (value: PickerValue) => void
  onStartTimeChange: (value: PickerValue) => void
  onEndDateChange: (value: PickerValue) => void
  onEndTimeChange: (value: PickerValue) => void
}

/**
 * Two-row layout used when showMore (expanded) or shouldShowFullFieldsInNormal is true.
 * Row 1: start date + start time
 * Row 2: end date + end time
 */
export const ExpandedDateTimeLayout: React.FC<ExpandedDateTimeLayoutProps> = ({
  startDateValue,
  startTimeValue,
  endDateValue,
  endTimeValue,
  hasError,
  isMobile,
  shouldShowTimeFields,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange
}) => {
  const { t } = useI18n()
  const containerProps = {
    alignItems: isMobile ? 'stretch' : 'center'
  }

  const dateBoxSx = isMobile
    ? { width: '100%' }
    : { maxWidth: '300px', width: '48%' }

  return (
    <>
      <Box display="flex" gap={1} sx={containerProps}>
        <Box sx={dateBoxSx}>
          <DatePickerField
            value={startDateValue}
            onChange={onStartDateChange}
            testId="start-date-input"
            label={t('dateTimeFields.startDate')}
          />
        </Box>
        {shouldShowTimeFields && (
          <Box width="110px">
            <TimePickerField
              value={startTimeValue}
              onChange={onStartTimeChange}
              testId="start-time-input"
              label={t('dateTimeFields.startTime')}
            />
          </Box>
        )}
      </Box>

      <Box display="flex" gap={1} sx={containerProps}>
        <Box sx={dateBoxSx}>
          <DatePickerField
            value={endDateValue}
            onChange={onEndDateChange}
            testId="end-date-input"
            label={t('dateTimeFields.endDate')}
            hasError={hasError}
          />
        </Box>
        {shouldShowTimeFields && (
          <Box width="110px">
            <TimePickerField
              value={endTimeValue}
              onChange={onEndTimeChange}
              testId="end-time-input"
              label={t('dateTimeFields.endTime')}
              hasError={hasError}
            />
          </Box>
        )}
      </Box>
    </>
  )
}
