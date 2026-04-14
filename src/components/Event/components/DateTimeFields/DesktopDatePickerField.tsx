import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import React from 'react'
import { LONG_DATE_FORMAT } from '../../utils/dateTimeFormatters'
import { ReadOnlyDateField } from '../ReadOnlyPickerField'
import {
  dateCalendarLayoutSx,
  getDateFieldSlotProps,
  getDateSlotProps
} from './dateTimePickerSlotProps'
import { DatePickerFieldProps } from './DatePickerField'

export const DesktopDatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  testId,
  label,
  hasError = false
}) => (
  <DatePicker
    format={LONG_DATE_FORMAT}
    value={value}
    onChange={onChange}
    slots={{ field: ReadOnlyDateField }}
    slotProps={{
      ...getDateSlotProps(testId, hasError, label),
      field: getDateFieldSlotProps(testId, hasError, label),
      layout: { sx: dateCalendarLayoutSx }
    }}
  />
)
