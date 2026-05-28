// ReadOnlyPickerField

import { TextField } from '@linagora/twake-mui'
import { TimePickerFieldProps } from '@mui/x-date-pickers/TimePicker'
import { DatePickerFieldProps } from '@mui/x-date-pickers/DatePicker'
import {
  useParsedFormat,
  usePickerContext,
  useSplitFieldProps
} from '@mui/x-date-pickers/hooks'
import { PickerFieldProps } from '@mui/x-date-pickers/models'
import {
  PickerFieldAdapter,
  PickerValidationScope,
  useValidation,
  validateDate,
  validateTime
} from '@mui/x-date-pickers/validation'
import { Dayjs } from 'dayjs'

type FieldType = 'date' | 'time' | 'date-time'

type GenericPickerFieldProps = PickerFieldProps<Dayjs, false, false> & {
  fieldType: FieldType
  validator: (
    value: Dayjs | null,
    context: PickerValidationScope,
    adapter: PickerFieldAdapter<Dayjs>
  ) => string | null
}

/**
 * Shared read-only field for date/time pickers. Disables typing, removes icon,
 * and opens the picker when clicking anywhere in the field.
 */
const ReadOnlyPickerField: React.FC<GenericPickerFieldProps> = props => {
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
    props: internalProps
  })

  const valueToDisplay =
    value == null ? '' : value.isValid() ? value.format(fieldFormat) : ''

  const mergedInputProps = {
    ...forwardedProps.InputProps,
    ref: triggerRef,
    readOnly: true,
    sx: {
      cursor: 'pointer',
      '& *': { cursor: 'inherit' },
      ...forwardedProps.InputProps?.sx
    }
  }

  return (
    <TextField
      {...forwardedProps}
      value={valueToDisplay}
      placeholder={parsedFormat}
      slotProps={{
        input: mergedInputProps
      }}
      error={hasValidationError || forwardedProps.error}
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
