import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { PickerValue } from '@mui/x-date-pickers/internals'
import { Dayjs } from 'dayjs'
import React from 'react'
import { LONG_DATE_FORMAT } from '../../utils/dateTimeFormatters'
import { ReadOnlyDateField } from '../ReadOnlyPickerField'
import {
  dateCalendarLayoutSx,
  getDateFieldSlotProps,
  getDateSlotProps
} from './dateTimePickerSlotProps'

export interface DatePickerFieldProps {
  value: Dayjs | null
  onChange: (value: PickerValue) => void
  testId: string
  label: string
  hasError?: boolean
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
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
