import { TextFieldProps } from '@linagora/twake-mui'
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

const baseFieldProps = (
  testId: string,
  hasError = false,
  label?: string
): Pick<
  TextFieldProps,
  | 'size'
  | 'margin'
  | 'fullWidth'
  | 'InputLabelProps'
  | 'error'
  | 'sx'
  | 'inputProps'
> => ({
  size: 'small' as const,
  margin: 'dense' as const,
  fullWidth: true,
  InputLabelProps: { shrink: true },
  error: hasError,
  sx: { width: '100%' },
  inputProps: {
    'data-testid': testId,
    ...(label ? { 'aria-label': label } : {})
  }
})

export const getDateSlotProps = (
  testId: string,
  hasError = false,
  label?: string
): Partial<DatePickerSlotProps<true>> => ({
  textField: {
    ...baseFieldProps(testId, hasError, label)
  }
})

export const getDateFieldSlotProps = (
  testId: string,
  hasError = false,
  label?: string
): Partial<DatePickerFieldProps> &
  Pick<
    TextFieldProps,
    | 'size'
    | 'margin'
    | 'fullWidth'
    | 'InputLabelProps'
    | 'error'
    | 'sx'
    | 'inputProps'
  > => baseFieldProps(testId, hasError, label)

export const getTimeFieldSlotProps = (
  testId: string,
  hasError = false,
  label?: string
): Partial<TimePickerFieldProps> &
  Pick<
    TextFieldProps,
    | 'size'
    | 'margin'
    | 'fullWidth'
    | 'InputLabelProps'
    | 'error'
    | 'sx'
    | 'inputProps'
  > => baseFieldProps(testId, hasError, label)
