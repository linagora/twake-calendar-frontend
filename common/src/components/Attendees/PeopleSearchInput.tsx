import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'
import {
  CircularProgress,
  TextField,
  type AutocompleteRenderInputParams
} from '@linagora/twake-mui'
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined'
import React, { type ReactNode } from 'react'
import { useI18n } from 'twake-i18n'

export interface ExtendedAutocompleteRenderInputParams extends AutocompleteRenderInputParams {
  error?: boolean
  helperText?: string | null
  placeholder?: string
  label?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export interface PeopleSearchInputProps {
  params: AutocompleteRenderInputParams
  loading: boolean
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void
  onToggleEventPreview?: () => void
  isOpen: boolean
  inputError: string | null
  searchPlaceholder: string
  inputSlot?: (params: ExtendedAutocompleteRenderInputParams) => ReactNode
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onEnterKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export const PeopleSearchInput: React.FC<PeopleSearchInputProps> = ({
  params,
  loading,
  handlePaste,
  onToggleEventPreview,
  isOpen,
  inputError,
  searchPlaceholder,
  inputSlot,
  onKeyDown,
  onEnterKeyDown
}) => {
  const { t } = useI18n()

  const inputSize = useResponsiveInputSize()

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    params.slotProps?.htmlInput?.onKeyDown?.(e)
    if (e.key === 'Enter') {
      // First, try the autocomplete selection handler
      onEnterKeyDown?.(e)
      // If event was already handled, don't trigger event preview
      if (e.defaultPrevented) return

      if (onToggleEventPreview && !isOpen) {
        e.preventDefault()
        ;(
          e as React.KeyboardEvent<HTMLInputElement> & {
            defaultMuiPrevented?: boolean
          }
        ).defaultMuiPrevented = true
        onToggleEventPreview()
      }
    }
  }

  // Extract only the Input component props, not htmlInput props
  const {
    startAdornment: paramsStartAdornment,
    endAdornment: paramsEndAdornment,
    ...inputComponentProps
  } = params.slotProps?.input || {}

  const inputProps = {
    ...inputComponentProps,
    startAdornment: paramsStartAdornment ?? (
      <PeopleOutlineOutlinedIcon
        fontSize="small"
        sx={{ mr: 1, color: 'action.active' }}
      />
    ),
    endAdornment: (
      <>
        {loading ? <CircularProgress color="inherit" size={20} /> : null}
        {paramsEndAdornment}
      </>
    )
  }

  const enhancedParams = {
    ...params,
    slotProps: {
      ...params.slotProps,
      input: inputProps,
      htmlInput: {
        ...params.slotProps?.htmlInput,
        autoComplete: 'off',
        onPaste: handlePaste,
        onKeyDown: handleKeyDown
      }
    }
  }

  const defaultTextFieldProps = {
    error: !!inputError,
    helperText: inputError,
    placeholder: searchPlaceholder,
    label: ''
  }

  if (inputSlot) {
    return (
      <>
        <label htmlFor={params.id} className="visually-hidden">
          {t('peopleSearch.label')}
        </label>
        {inputSlot({
          ...enhancedParams,
          error: !!inputError,
          helperText: inputError,
          placeholder: searchPlaceholder,
          label: ''
        })}
      </>
    )
  }

  return (
    <>
      <label htmlFor={params.id} className="visually-hidden">
        {t('peopleSearch.label')}
      </label>
      <TextField
        {...enhancedParams}
        {...defaultTextFieldProps}
        size={inputSize}
        sx={{
          '& .MuiInputBase-input': {
            maxWidth: '90%'
          }
        }}
      />
    </>
  )
}
