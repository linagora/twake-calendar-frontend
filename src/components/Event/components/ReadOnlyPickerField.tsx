import { TextField } from "@linagora/twake-mui";
import { DatePickerFieldProps } from "@mui/x-date-pickers/DatePicker";
import {
  useParsedFormat,
  usePickerContext,
  useSplitFieldProps,
} from "@mui/x-date-pickers/hooks";
import { PickerFieldProps } from "@mui/x-date-pickers/models";
import {
  PickerFieldAdapter,
  PickerValidationScope,
  useValidation,
  validateDate,
} from "@mui/x-date-pickers/validation";
import { Dayjs } from "dayjs";

type FieldType = "date" | "time" | "date-time";

type GenericPickerFieldProps = PickerFieldProps<Dayjs, false, false> & {
  fieldType: FieldType;
  validator: (
    value: Dayjs | null,
    context: PickerValidationScope,
    adapter: PickerFieldAdapter<Dayjs>
  ) => string | null;
};

/**
 * Shared read-only field for date/time pickers. Disables typing, removes icon,
 * and opens the picker when clicking anywhere in the field.
 */
function ReadOnlyPickerField(props: GenericPickerFieldProps) {
  const { fieldType, validator, ...fieldProps } = props;
  const { internalProps, forwardedProps } = useSplitFieldProps(
    fieldProps,
    fieldType
  );

  const pickerContext = usePickerContext();
  const parsedFormat = useParsedFormat();

  const { hasValidationError } = useValidation({
    validator,
    value: pickerContext.value,
    timezone: pickerContext.timezone,
    props: internalProps,
  });

  const valueToDisplay =
    pickerContext.value == null
      ? ""
      : pickerContext.value.isValid()
        ? pickerContext.value.format(pickerContext.fieldFormat)
        : "";

  const mergedInputProps = {
    ...forwardedProps.InputProps,
    ref: pickerContext.triggerRef,
    readOnly: true,
    sx: {
      cursor: "pointer",
      "& *": { cursor: "inherit" },
      ...forwardedProps.InputProps?.sx,
    },
  };

  return (
    <TextField
      {...forwardedProps}
      value={valueToDisplay}
      placeholder={
        (forwardedProps.placeholder as string) ?? (parsedFormat as string)
      }
      InputProps={mergedInputProps}
      error={hasValidationError}
      focused={pickerContext.open}
      onClick={() => pickerContext.setOpen((prev) => !prev)}
      className={pickerContext.rootClassName}
      sx={pickerContext.rootSx}
      ref={pickerContext.rootRef}
      name={pickerContext.name}
    />
  );
}

export function ReadOnlyDateField(props: DatePickerFieldProps) {
  return (
    <ReadOnlyPickerField {...props} fieldType="date" validator={validateDate} />
  );
}
