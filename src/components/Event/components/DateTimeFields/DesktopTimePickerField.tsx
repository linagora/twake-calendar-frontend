import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import React from 'react'
import { EditableTimeField } from '../EditableTimeField'
import {
  getTimeFieldSlotProps,
  timePickerPopperSx
} from './dateTimePickerSlotProps'
import { TimePickerFieldProps } from './TimePickerField'

export const DesktopTimePickerField: React.FC<TimePickerFieldProps> = ({
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
