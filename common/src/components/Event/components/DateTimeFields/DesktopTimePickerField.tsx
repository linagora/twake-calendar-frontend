import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import React from 'react'
import { EditableTimeField } from '@common/components/Event/components/EditableTimeField'
import {
  getTimeFieldSlotProps,
  timePickerPopperSx
} from './dateTimePickerSlotProps'
import { TimePickerFieldProps } from './TimePickerField'
import { useDateTimeErrorId } from './DateTimeError'

export const DesktopTimePickerField: React.FC<TimePickerFieldProps> = ({
  value,
  onChange,
  testId,
  label,
  hasError = false,
  errorId,
  disabled = false
}) => {
  const contextErrorId = useDateTimeErrorId()
  return (
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
        field: getTimeFieldSlotProps(
          testId,
          hasError,
          label,
          false,
          errorId ?? contextErrorId
        ),
        textField: { disabled }
      }}
    />
  )
}
