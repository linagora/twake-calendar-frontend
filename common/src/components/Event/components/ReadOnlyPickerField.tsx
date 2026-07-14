import { TextField } from '@linagora/twake-mui'
import { TimePickerFieldProps } from '@mui/x-date-pickers/TimePicker'
import { DatePickerFieldProps } from '@mui/x-date-pickers/DatePicker'
import {
  useParsedFormat,
  usePickerContext,
  useSplitFieldProps
} from '@mui/x-date-pickers/hooks'
import {
  DateValidationError,
  PickerFieldSlotProps,
  TimeValidationError
} from '@mui/x-date-pickers/models'
import {
  useValidation,
  validateDate,
  ValidateDateProps,
  validateTime,
  ValidateTimeProps,
  type Validator
} from '@mui/x-date-pickers/validation'
import { Dayjs } from 'dayjs'
import { useI18n } from 'twake-i18n'
import { PickerValue } from '@mui/x-date-pickers/internals'

type FieldType = 'date' | 'time' | 'date-time'

type GenericPickerFieldProps<
  TProps = ValidateDateProps | ValidateTimeProps,
  TError = DateValidationError | TimeValidationError
> = PickerFieldSlotProps<Dayjs> & {
  fieldType: FieldType
  validator: Validator<PickerValue, TError, TProps>
}

const formatPickerValue = (
  value: Dayjs | null | undefined,
  lang: string,
  fieldFormat: string
): string => {
  if (!value || !value.isValid()) return ''
  const formatted = value.locale(lang).format(fieldFormat)
  return formatted ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : ''
}

/**
 * Shared read-only field for date/time pickers. Disables typing, removes icon,
 * and opens the picker when clicking anywhere in the field.
 */
const ReadOnlyPickerField = <
  TProps extends ValidateDateProps | ValidateTimeProps,
  TError extends DateValidationError | TimeValidationError
>(
  props: GenericPickerFieldProps<TProps, TError>
): React.ReactNode => {
  const { lang } = useI18n()

  const { fieldType, validator, ...fieldProps } = props
  const { internalProps, forwardedProps } = useSplitFieldProps(
    fieldProps,
    fieldType
  )

  const {
    value,
    timezone,
    fieldFormat,
    open,
    setOpen,
    triggerRef,
    rootClassName,
    rootSx,
    rootRef,
    name: pickerName
  } = usePickerContext()

  const parsedFormat = useParsedFormat()

  const { hasValidationError } = useValidation({
    validator,
    value: value,
    timezone: timezone,
    props: internalProps as unknown as TProps
  })

  const valueToDisplay = formatPickerValue(value, lang, fieldFormat)

  const fp = forwardedProps as React.ComponentProps<typeof TextField> & {
    slotProps?: {
      input?: Omit<React.HTMLAttributes<HTMLInputElement>, 'color'> & {
        sx?: Record<string, unknown>
        startAdornment?: React.ReactNode
        endAdornment?: React.ReactNode
      }
      htmlInput?: React.InputHTMLAttributes<HTMLInputElement> & {
        'data-testid'?: string
      }
    }
  }

  const {
    startAdornment: inputStartAdornment,
    endAdornment: inputEndAdornment,
    ...inputComponentProps
  } = fp.slotProps?.input || {}

  const mergedSlotProps = {
    ...fp.slotProps,
    input: {
      ...inputComponentProps,
      startAdornment: inputStartAdornment,
      endAdornment: inputEndAdornment,
      ref: triggerRef,
      readOnly: true,
      sx: {
        cursor: 'pointer',
        '& *': { cursor: 'inherit' },
        ...inputComponentProps.sx
      }
    },
    htmlInput: fp.slotProps?.htmlInput
  } as React.ComponentProps<typeof TextField>['slotProps']

  return (
    <TextField
      {...(forwardedProps as React.ComponentProps<typeof TextField>)}
      value={valueToDisplay}
      placeholder={parsedFormat}
      slotProps={mergedSlotProps}
      error={hasValidationError || fp.error}
      focused={open}
      onClick={() => setOpen((prev: boolean) => !prev)}
      className={rootClassName}
      sx={rootSx}
      ref={rootRef}
      name={pickerName}
    />
  )
}

export const ReadOnlyDateField: React.FC<DatePickerFieldProps> = props => {
  return (
    <ReadOnlyPickerField {...props} fieldType="date" validator={validateDate} />
  )
}

export const ReadOnlyTimeField: React.FC<TimePickerFieldProps> = props => {
  return (
    <ReadOnlyPickerField {...props} fieldType="time" validator={validateTime} />
  )
}
