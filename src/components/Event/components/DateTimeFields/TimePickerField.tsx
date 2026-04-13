import useMediaQuery from '@mui/material/useMediaQuery'
import { PickerValue } from '@mui/x-date-pickers/internals'
import { Dayjs } from 'dayjs'
import React from 'react'
import { DesktopTimePickerField } from './DesktopTimePickerField'
import { TouchTimePickerField } from './TouchTimePickerField'

export interface TimePickerFieldProps {
  value: Dayjs | null
  onChange: (value: PickerValue) => void
  testId: string
  label: string
  hasError?: boolean
  disabled?: boolean
}

export const TimePickerField: React.FC<TimePickerFieldProps> = props => {
  const isTouch = useMediaQuery('(pointer: coarse)')
  return isTouch ? (
    <TouchTimePickerField {...props} />
  ) : (
    <DesktopTimePickerField {...props} />
  )
}
