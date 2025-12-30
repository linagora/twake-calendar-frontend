import React, { useState, useRef, useEffect, useCallback } from "react";
import { TextField } from "@linagora/twake-mui";
import {
  PickerFieldAdapter,
  PickerValidationScope,
  useValidation,
  validateTime,
} from "@mui/x-date-pickers/validation";
import {
  useSplitFieldProps,
  useParsedFormat,
  usePickerContext,
  usePickerActionsContext,
} from "@mui/x-date-pickers/hooks";
import { PickerFieldProps } from "@mui/x-date-pickers/models";
import { TimePickerFieldProps } from "@mui/x-date-pickers/TimePicker";
import dayjs, { Dayjs } from "dayjs";
import { parseTimeInput } from "../utils/dateTimeHelpers";

type FieldType = "date" | "time" | "date-time";

type GenericPickerFieldProps = PickerFieldProps<any, any, any> & {
  fieldType: FieldType;
  validator: (
    value: any,
    context: PickerValidationScope,
    adapter: PickerFieldAdapter<any>
  ) => string | null;
};

const TIME_DISPLAY_FORMAT = "HH:mm";

/**
 * Editable field for time pickers. Allows free typing with format on blur/enter.
 * Click anywhere in the field to open picker.
 */
function EditableTimePickerField(props: GenericPickerFieldProps) {
  const { fieldType, validator, ...fieldProps } = props;
  const { internalProps, forwardedProps } = useSplitFieldProps(
    fieldProps,
    fieldType
  );

  const pickerContext = usePickerContext();
  const pickerActions = usePickerActionsContext();
  const parsedFormat = useParsedFormat();
  const inputRef = useRef<HTMLInputElement>(null);

  const getFormattedValue = useCallback(() => {
    if (pickerContext.value == null) return "";
    if (!pickerContext.value.isValid()) return "";
    return pickerContext.value.format(TIME_DISPLAY_FORMAT);
  }, [pickerContext.value]);

  const [inputValue, setInputValue] = useState(getFormattedValue);
  const [isFocused, setIsFocused] = useState(false);
  const [pendingCommitValue, setPendingCommitValue] = useState<string | null>(
    null
  );
  const prevFormattedValueRef = useRef(getFormattedValue());
  const isDispatchingCloseEventRef = useRef(false);
  const hasDispatchedInMicrotaskRef = useRef(false);

  // Sync input value when picker value changes from dropdown selection or external
  useEffect(() => {
    const newFormattedValue = getFormattedValue();
    const valueChanged = newFormattedValue !== prevFormattedValueRef.current;

    // Sync when:
    // 1. Value changed (from dropdown selection or external)
    // 2. Not focused (external change)
    if (valueChanged || !isFocused) {
      setInputValue(newFormattedValue);
    }

    // Close dropdown after selection (value changed while dropdown is open)
    if (valueChanged && pickerContext.open) {
      pickerContext.setOpen(false);
      // Clear focus after dropdown selection
      setIsFocused(false);
      inputRef.current?.blur();
    }

    prevFormattedValueRef.current = newFormattedValue;
  }, [getFormattedValue, isFocused, pickerContext]);

  const wasOpenRef = useRef(pickerContext.open);

  // Handle dropdown open/close
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    const isOpen = pickerContext.open;

    if (isOpen && !wasOpen && inputRef.current) {
      // Dropdown just opened - refocus input to allow typing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      wasOpenRef.current = isOpen;
      return () => clearTimeout(timer);
    }

    if (!isOpen && wasOpen) {
      // Dropdown just closed - check if we need to commit user input
      const current = getFormattedValue();
      if (isFocused && inputValue.trim() && inputValue !== current) {
        // Store input value to commit later (after parseAndUpdateTime is defined)
        setPendingCommitValue(inputValue);
      } else {
        setInputValue(current);
      }
      setIsFocused(false);
      // Blur input to clear DOM focus (removes Mui-focused class)
      inputRef.current?.blur();
    }

    wasOpenRef.current = isOpen;
  }, [pickerContext.open, getFormattedValue, isFocused, inputValue]);

  const { hasValidationError } = useValidation({
    validator,
    value: pickerContext.value,
    timezone: pickerContext.timezone,
    props: internalProps,
  });

  const parseAndUpdateTime = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setInputValue(getFormattedValue());
        return;
      }

      const newValue = parseTimeInput(
        trimmed,
        pickerContext.value as Dayjs | null
      );

      if (newValue) {
        // Update picker internal state and trigger onChange in one call
        pickerActions.setValue(newValue, { changeImportance: "accept" });
        setInputValue(newValue.format(TIME_DISPLAY_FORMAT));
      } else {
        // Invalid input - reset to current value
        setInputValue(getFormattedValue());
      }
    },
    [pickerContext, pickerActions, getFormattedValue]
  );

  // Commit pending input value when picker closes (after parseAndUpdateTime is defined)
  useEffect(() => {
    if (pendingCommitValue !== null) {
      parseAndUpdateTime(pendingCommitValue);
      setPendingCommitValue(null);
    }
  }, [pendingCommitValue, parseAndUpdateTime]);

  // Listen for close events from other picker fields
  useEffect(() => {
    const handleCloseOtherPickers = () => {
      // Don't close if this field is the one dispatching the event
      if (isDispatchingCloseEventRef.current) {
        return;
      }
      // If this picker is open and another field is requesting to close others
      if (pickerContext.open) {
        pickerContext.setOpen(false);
      }
    };

    window.addEventListener(
      "close-other-time-pickers",
      handleCloseOtherPickers
    );
    return () => {
      window.removeEventListener(
        "close-other-time-pickers",
        handleCloseOtherPickers
      );
    };
  }, [pickerContext]);

  const dispatchCloseOtherPickers = useCallback(() => {
    // Guard: prevent duplicate dispatch in the same microtask
    if (hasDispatchedInMicrotaskRef.current) {
      return;
    }

    // Mark that we've dispatched in this microtask
    hasDispatchedInMicrotaskRef.current = true;

    // Set flag to prevent this field from closing its own picker
    isDispatchingCloseEventRef.current = true;
    // Notify other pickers to close
    window.dispatchEvent(new CustomEvent("close-other-time-pickers"));
    // Reset flags in next microtask to ensure event is processed first
    Promise.resolve().then(() => {
      isDispatchingCloseEventRef.current = false;
      hasDispatchedInMicrotaskRef.current = false;
    });
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (forwardedProps.disabled || forwardedProps.readOnly) return;

    // Stop propagation to prevent parent from toggling the picker
    e.stopPropagation();

    dispatchCloseOtherPickers();

    // Always keep it open when clicked, or open it if closed
    if (!pickerContext.open) {
      pickerContext.setOpen(true);
    }
  };

  const handleFocus = () => {
    if (forwardedProps.disabled || forwardedProps.readOnly) return;

    setIsFocused(true);
    dispatchCloseOtherPickers();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If dropdown is open, don't parse input
    // MUI will handle selection and sync value via useEffect
    if (pickerContext.open) {
      return;
    }

    // Dropdown is closed - parse input and update value
    setIsFocused(false);
    parseAndUpdateTime(inputValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      parseAndUpdateTime(inputValue);
      setIsFocused(false);
      pickerContext.setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setInputValue(getFormattedValue());
      setIsFocused(false);
      pickerContext.setOpen(false);
      inputRef.current?.blur();
    }
  };

  const mergedInputProps = {
    ...forwardedProps.InputProps,
    ref: pickerContext.triggerRef,
    sx: {
      cursor: "text",
      ...forwardedProps.InputProps?.sx,
    },
  };

  return (
    <TextField
      {...forwardedProps}
      value={inputValue}
      onChange={handleChange}
      placeholder={parsedFormat as string}
      InputProps={mergedInputProps}
      inputRef={inputRef}
      error={hasValidationError || forwardedProps.error}
      focused={isFocused}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={pickerContext.rootClassName}
      sx={{
        ...pickerContext.rootSx,
        "& input": {
          textAlign: "center",
        },
      }}
      ref={pickerContext.rootRef}
      name={pickerContext.name}
    />
  );
}

export function EditableTimeField(props: TimePickerFieldProps) {
  return (
    <EditableTimePickerField
      {...props}
      fieldType="time"
      validator={validateTime}
    />
  );
}
