import type { PickersTextFieldProps } from '@mui/x-date-pickers/PickersTextField'
import {
  DatePickerFieldProps,
  DatePickerSlotProps
} from '@mui/x-date-pickers/DatePicker'
import { TimePickerFieldProps } from '@mui/x-date-pickers/TimePicker'

export const dateCalendarLayoutSx = {
  '& .MuiDateCalendar-root.MuiDateCalendar-root': {
    width: '260px',
    maxWidth: '260px',
    padding: '0 15px'
  }
}

export const timePickerPopperSx = {
  '& .MuiPaper-root': {
    width: '110px',
    minWidth: '110px'
  },
  '& .MuiMultiSectionDigitalClockSection-item': {
    justifyContent: 'flex-start',
    width: '100%',
    textAlign: 'left'
  }
}

type BaseFieldProps = Pick<
  PickersTextFieldProps,
  'size' | 'margin' | 'fullWidth' | 'error' | 'sx' | 'slotProps'
>

const baseFieldProps = (
  testId: string,
  hasError = false,
  label?: string,
  isMobile?: boolean
): BaseFieldProps => ({
  size: isMobile ? ('medium' as const) : ('small' as const),
  margin: 'dense' as const,
  fullWidth: true,
  error: hasError,
  sx: { width: '100%' },
  slotProps: {
    inputLabel: { shrink: true },
    htmlInput: {
      'data-testid': testId,
      ...(label ? { 'aria-label': label } : {})
    } as React.InputHTMLAttributes<HTMLInputElement> & {
      'data-testid'?: string
    }
  }
})

export const getDateSlotProps = (
  testId: string,
  hasError = false,
  label?: string,
  isMobile?: boolean
): Partial<DatePickerSlotProps> => ({
  textField: baseFieldProps(testId, hasError, label, isMobile)
})

export const getDateFieldSlotProps = (
  testId: string,
  hasError = false,
  label?: string,
  isMobile?: boolean
): Partial<DatePickerFieldProps> & BaseFieldProps =>
  baseFieldProps(testId, hasError, label, isMobile)

export const getTimeFieldSlotProps = (
  testId: string,
  hasError = false,
  label?: string,
  isMobile?: boolean
): Partial<TimePickerFieldProps> & BaseFieldProps =>
  baseFieldProps(testId, hasError, label, isMobile)
