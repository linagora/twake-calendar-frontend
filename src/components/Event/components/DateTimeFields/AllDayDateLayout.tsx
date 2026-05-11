import { Box } from '@linagora/twake-mui'
import { PickerValue } from '@mui/x-date-pickers/internals'
import dayjs from 'dayjs'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { DateTimeErrors } from '../../utils/formValidation'
import { DatePickerField } from './DatePickerField'

export interface AllDayDateLayoutProps {
  startDateValue: ReturnType<typeof dayjs> | null
  endDateValue: ReturnType<typeof dayjs> | null
  errors: DateTimeErrors
  isMobile: boolean
  onStartDateChange: (value: PickerValue) => void
  onEndDateChange: (value: PickerValue) => void
}

/**
 * Side-by-side date pickers with no time fields.
 * Used for all-day events or when showEndDate is true.
 */
export const AllDayDateLayout: React.FC<AllDayDateLayoutProps> = ({
  startDateValue,
  endDateValue,
  errors,
  isMobile,
  onStartDateChange,
  onEndDateChange
}) => {
  const { t } = useI18n()

  const containerProps = {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center'
  }

  const dateBoxSx = isMobile
    ? { width: '100%' }
    : { maxWidth: '300px', width: '48%' }

  return (
    <Box display="flex" gap={1} sx={containerProps}>
      <Box sx={dateBoxSx}>
        <DatePickerField
          value={startDateValue}
          onChange={onStartDateChange}
          testId="start-date-input"
          label={t('dateTimeFields.startDate')}
          hasError={!!errors.date?.start}
        />
      </Box>
      <Box sx={dateBoxSx}>
        <DatePickerField
          value={endDateValue}
          onChange={onEndDateChange}
          testId="end-date-input"
          label={t('dateTimeFields.endDate')}
          hasError={!!errors.date?.end}
        />
      </Box>
    </Box>
  )
}
