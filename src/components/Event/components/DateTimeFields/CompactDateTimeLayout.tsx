import { Box, Typography } from '@linagora/twake-mui'
import { PickerValue } from '@mui/x-date-pickers/internals'
import { Dayjs } from 'dayjs'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { DatePickerField } from './DatePickerField'
import { TimePickerField } from './TimePickerField'

export interface CompactDateTimeLayoutProps {
  startDateValue: Dayjs | null
  startTimeValue: Dayjs | null
  endTimeValue: Dayjs | null
  hasError: boolean
  isMobile: boolean
  allday: boolean
  startDateLabel: string
  onStartDateChange: (value: PickerValue) => void
  onStartTimeChange: (value: PickerValue) => void
  onEndTimeChange: (value: PickerValue) => void
}

/**
 * Default compact layout: one date field + start and end time pickers inline.
 * Used when the event is not multi-day and has no explicit end date shown.
 */
export const CompactDateTimeLayout: React.FC<CompactDateTimeLayoutProps> = ({
  startDateValue,
  startTimeValue,
  endTimeValue,
  hasError,
  isMobile,
  allday,
  startDateLabel,
  onStartDateChange,
  onStartTimeChange,
  onEndTimeChange
}) => {
  const { t } = useI18n()

  const containerProps = {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center'
  }

  const dateBoxSx = isMobile
    ? { width: '100%' }
    : { maxWidth: '300px', width: '48%' }

  const timeRowSx = isMobile ? { width: '100%' } : undefined

  const timeBoxSx = {
    flex: isMobile ? 1 : undefined,
    width: isMobile ? undefined : '110px'
  }

  return (
    <Box display="flex" gap={1} sx={containerProps}>
      <Box sx={dateBoxSx}>
        <DatePickerField
          value={startDateValue}
          onChange={onStartDateChange}
          testId="start-date-input"
          label={startDateLabel}
        />
      </Box>

      <Box display="flex" gap={1} flexDirection="row" sx={timeRowSx}>
        <Box sx={timeBoxSx}>
          <TimePickerField
            value={startTimeValue}
            onChange={onStartTimeChange}
            testId="start-time-input"
            label={t('dateTimeFields.startTime')}
            disabled={allday}
          />
        </Box>

        {!allday && (
          <Typography sx={{ alignSelf: 'center', mx: 0.5, mt: 0.5 }}>
            -
          </Typography>
        )}

        <Box sx={timeBoxSx}>
          <TimePickerField
            value={endTimeValue}
            onChange={onEndTimeChange}
            testId="end-time-input"
            label={t('dateTimeFields.endTime')}
            hasError={hasError}
            disabled={allday}
          />
        </Box>
      </Box>
    </Box>
  )
}
