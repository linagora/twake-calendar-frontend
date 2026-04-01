// EditableTimeField

import { TextField } from '@linagora/twake-mui'
import {
  useParsedFormat,
  usePickerActionsContext,
  usePickerContext,
  useSplitFieldProps
} from '@mui/x-date-pickers/hooks'
import { PickerFieldProps } from '@mui/x-date-pickers/models'
import { TimePickerFieldProps } from '@mui/x-date-pickers/TimePicker'
import {
  PickerFieldAdapter,
  PickerValidationScope,
  useValidation,
  validateTime
} from '@mui/x-date-pickers/validation'
import { Dayjs } from 'dayjs'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { parseTimeInput } from '../utils/dateTimeHelpers'

type FieldType = 'date' | 'time' | 'date-time'

type GenericPickerFieldProps = PickerFieldProps<Dayjs, false, false> & {
  fieldType: FieldType
  validator: (
    value: Dayjs | null,
    context: PickerValidationScope,
    adapter: PickerFieldAdapter<Dayjs>
  ) => string | null
}

const TIME_DISPLAY_FORMAT = 'HH:mm'

/**
 * Editable field for time pickers. Allows free typing with format on blur/enter.
 * Click anywhere in the field to open picker.
 */
function EditableTimePickerField(props: GenericPickerFieldProps) {
  const { fieldType, validator, ...fieldProps } = props
  const { internalProps, forwardedProps } = useSplitFieldProps(
    fieldProps,
    fieldType
  )

  const {
    value: pickerValue,
    open,
    setOpen,
    timezone,
    triggerRef,
    rootClassName,
    rootSx,
    rootRef,
    name: pickerName
  } = usePickerContext()
  const pickerActions = usePickerActionsContext()
  const parsedFormat = useParsedFormat()
  const inputRef = useRef<HTMLInputElement>(null)

  const getFormattedValue = useCallback(() => {
    if (pickerValue == null) return ''
    if (!pickerValue.isValid()) return ''
    return pickerValue.format(TIME_DISPLAY_FORMAT)
  }, [pickerValue])

  const [inputValue, setInputValue] = useState(getFormattedValue)
  const [isFocused, setIsFocused] = useState(false)
  const [pendingCommitValue, setPendingCommitValue] = useState<string | null>(
    null
  )
  const prevFormattedValueRef = useRef(getFormattedValue())
  const isDispatchingCloseEventRef = useRef(false)
  const hasDispatchedInMicrotaskRef = useRef(false)

  // Sync input value when picker value changes from dropdown selection or external
  useEffect(() => {
    const updateInputValue = () => {
      const newFormattedValue = getFormattedValue()
      const valueChanged = newFormattedValue !== prevFormattedValueRef.current

      // Sync when:
      // 1. Value changed (from dropdown selection or external)
      // 2. Not focused (external change)
      if (valueChanged || !isFocused) {
        setInputValue(newFormattedValue)
      }

      // Close dropdown after selection (value changed while dropdown is open)
      if (valueChanged && open) {
        setOpen(false)
        // Clear focus after dropdown selection
        setIsFocused(false)
        inputRef.current?.blur()
      }

      prevFormattedValueRef.current = newFormattedValue
    }
    updateInputValue()
  }, [getFormattedValue, isFocused, open, setOpen])

  const wasOpenRef = useRef(open)

  // Handle dropdown open/close
  useEffect(() => {
    const handleDropdown = () => {
      const wasOpen = wasOpenRef.current
      const isOpen = open

      if (isOpen && !wasOpen && inputRef.current) {
        // Dropdown just opened - refocus input to allow typing
        const timer = setTimeout(() => {
          inputRef.current?.focus()
        }, 10)
        wasOpenRef.current = isOpen
        return () => clearTimeout(timer)
      }

      if (!isOpen && wasOpen) {
        // Dropdown just closed - check if we need to commit user input
        const current = getFormattedValue()
        if (isFocused && inputValue.trim() && inputValue !== current) {
          // Store input value to commit later (after parseAndUpdateTime is defined)
          setPendingCommitValue(inputValue)
        } else {
          setInputValue(current)
        }
        setIsFocused(false)
        // Blur input to clear DOM focus (removes Mui-focused class)
        inputRef.current?.blur()
      }

      wasOpenRef.current = isOpen
    }
    handleDropdown()
  }, [open, getFormattedValue, isFocused, inputValue])

  const { hasValidationError } = useValidation({
    validator,
    value: pickerValue,
    timezone: timezone,
    props: internalProps
  })

  const parseAndUpdateTime = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        setInputValue(getFormattedValue())
        return
      }

      const newValue = parseTimeInput(trimmed, pickerValue as Dayjs | null)

      if (newValue) {
        // Update picker internal state and trigger onChange in one call
        pickerActions.setValue(newValue, { changeImportance: 'accept' })
        setInputValue(newValue.format(TIME_DISPLAY_FORMAT))
      } else {
        // Invalid input - reset to current value
        setInputValue(getFormattedValue())
      }
    },
    [pickerValue, pickerActions, getFormattedValue]
  )

  // Commit pending input value when picker closes (after parseAndUpdateTime is defined)
  useEffect(() => {
    const updateTimeAndClearPending = () => {
      if (pendingCommitValue !== null) {
        parseAndUpdateTime(pendingCommitValue)
        setPendingCommitValue(null)
      }
    }
    updateTimeAndClearPending()
  }, [pendingCommitValue, parseAndUpdateTime])

  // Listen for close events from other picker fields
  useEffect(() => {
    const handleCloseOtherPickers = () => {
      // Don't close if this field is the one dispatching the event
      if (isDispatchingCloseEventRef.current) {
        return
      }
      // If this picker is open and another field is requesting to close others
      if (open) {
        setOpen(false)
      }
    }

    window.addEventListener('close-other-time-pickers', handleCloseOtherPickers)
    return () => {
      window.removeEventListener(
        'close-other-time-pickers',
        handleCloseOtherPickers
      )
    }
  }, [open, setOpen])

  const dispatchCloseOtherPickers = useCallback(() => {
    // Guard: prevent duplicate dispatch in the same microtask
    if (hasDispatchedInMicrotaskRef.current) {
      return
    }

    // Mark that we've dispatched in this microtask
    hasDispatchedInMicrotaskRef.current = true

    // Set flag to prevent this field from closing its own picker
    isDispatchingCloseEventRef.current = true
    // Notify other pickers to close
    window.dispatchEvent(new CustomEvent('close-other-time-pickers'))
    // Reset flags in next microtask to ensure event is processed first
    Promise.resolve()
      .then(() => {
        isDispatchingCloseEventRef.current = false
        hasDispatchedInMicrotaskRef.current = false
        return
      })
      .catch(error => {
        console.error('Error resetting picker close flags:', error)
      })
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    if (forwardedProps.disabled || forwardedProps.readOnly) return

    // Stop propagation to prevent parent from toggling the picker
    e.stopPropagation()

    dispatchCloseOtherPickers()

    // Always keep it open when clicked, or open it if closed
    if (!open) {
      setOpen(true)
    }
  }

  const handleFocus = () => {
    if (forwardedProps.disabled || forwardedProps.readOnly) return

    setIsFocused(true)
    dispatchCloseOtherPickers()
  }

  const handleBlur = (_e: React.FocusEvent<HTMLInputElement>) => {
    // If dropdown is open, don't parse input
    // MUI will handle selection and sync value via useEffect
    if (open) {
      return
    }

    // Dropdown is closed - parse input and update value
    setIsFocused(false)
    parseAndUpdateTime(inputValue)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      parseAndUpdateTime(inputValue)
      setIsFocused(false)
      setOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setInputValue(getFormattedValue())
      setIsFocused(false)
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const mergedInputProps = {
    ...forwardedProps.InputProps,
    ref: triggerRef,
    sx: {
      cursor: 'text',
      ...forwardedProps.InputProps?.sx
    }
  }

  return (
    <TextField
      {...forwardedProps}
      value={inputValue}
      onChange={handleChange}
      placeholder={parsedFormat}
      InputProps={mergedInputProps}
      inputRef={inputRef}
      error={hasValidationError || forwardedProps.error}
      focused={isFocused}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={rootClassName}
      sx={{
        ...rootSx,
        '& input': {
          textAlign: 'center'
        }
      }}
      ref={rootRef}
      name={pickerName}
    />
  )
}

export function EditableTimeField(props: TimePickerFieldProps) {
  return (
    <EditableTimePickerField
      {...props}
      fieldType="time"
      validator={validateTime}
    />
  )
}
