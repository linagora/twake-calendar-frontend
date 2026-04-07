import { PickerValue } from '@mui/x-date-pickers/internals'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { Dayjs } from 'dayjs'
import React from 'react'
import { EditableTimeField } from '../EditableTimeField'
import {
  getTimeFieldSlotProps,
  timePickerPopperSx
} from './dateTimePickerSlotProps'

export interface TimePickerFieldProps {
  value: Dayjs | null
  onChange: (value: PickerValue) => void
  testId: string
  label: string
  hasError?: boolean
  disabled?: boolean
}

export const TimePickerField: React.FC<TimePickerFieldProps> = ({
  value,
  onChange,
  testId,
  label,
  hasError = false,
  disabled = false
}) => (
  <TimePicker
    ampm={false}
    value={value}
    onChange={onChange}
    disabled={disabled}
    thresholdToRenderTimeInASingleColumn={48}
    timeSteps={{ minutes: 30 }}
    slots={{
      field: EditableTimeField,
      actionBar: () => null
    }}
    slotProps={{
      openPickerButton: { sx: { display: 'none' } },
      popper: { sx: timePickerPopperSx },
      field: getTimeFieldSlotProps(testId, hasError, label)
    }}
  />
)
