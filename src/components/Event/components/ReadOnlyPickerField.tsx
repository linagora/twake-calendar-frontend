import React from "react";
import TextField from "@mui/material/TextField";
import {
  PickerFieldAdapter,
  PickerValidationScope,
  useValidation,
  validateDate,
} from "@mui/x-date-pickers/validation";
import {
  useSplitFieldProps,
  useParsedFormat,
  usePickerContext,
} from "@mui/x-date-pickers/hooks";
import { PickerFieldProps } from "@mui/x-date-pickers/models";
import { DatePickerFieldProps } from "@mui/x-date-pickers/DatePicker";

type FieldType = "date" | "time" | "date-time";

type GenericPickerFieldProps = PickerFieldProps<any, any, any> & {
  fieldType: FieldType;
  validator: (
    value: any,
    context: PickerValidationScope,
    adapter: PickerFieldAdapter<any>
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
      placeholder={parsedFormat as string}
      InputProps={mergedInputProps}
      error={hasValidationError}
      focused={pickerContext.open}
      onClick={() => pickerContext.setOpen((prev) => !prev)}
      className={pickerContext.rootClassName}
      sx={pickerContext.rootSx}
      ref={pickerContext.rootRef}
      name={pickerContext.name}
      label={pickerContext.label}
    />
  );
}

export function ReadOnlyDateField(props: DatePickerFieldProps) {
  return (
    <ReadOnlyPickerField
      {...props}
      fieldType="date"
      validator={validateDate}
    />
  );
}


