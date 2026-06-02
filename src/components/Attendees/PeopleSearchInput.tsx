import React, { type ReactNode } from 'react'
import {
  CircularProgress,
  TextField,
  type AutocompleteRenderInputParams
} from '@linagora/twake-mui'
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined'
import { useI18n } from 'twake-i18n'
import { useResponsiveInputSize } from '@/hooks/useResponsiveInputSize'

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
}

export const PeopleSearchInput: React.FC<PeopleSearchInputProps> = ({
  params,
  loading,
  handlePaste,
  onToggleEventPreview,
  isOpen,
  inputError,
  searchPlaceholder,
  inputSlot
}) => {
  const { t } = useI18n()

  const inputSize = useResponsiveInputSize()

  const inputProps = {
    ...params.InputProps,
    startAdornment: params.InputProps.startAdornment ?? (
      <PeopleOutlineOutlinedIcon
        fontSize="small"
        sx={{ mr: 1, color: 'action.active' }}
      />
    ),
    endAdornment: (
      <>
        {loading ? <CircularProgress color="inherit" size={20} /> : null}
        {params.InputProps.endAdornment}
      </>
    )
  }

  const enhancedParams = {
    ...params,
    InputProps: inputProps,
    inputProps: {
      ...params.inputProps,
      autoComplete: 'off',
      onPaste: handlePaste,
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>): void => {
        params.inputProps.onKeyDown?.(e)
        if (e.key === 'Enter') {
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
    }
  }

  const defaultTextFieldProps = {
    error: !!inputError,
    helperText: inputError,
    placeholder: searchPlaceholder,
    label: '',
    slotProps: {
      input: {
        ...inputProps
      }
    }
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
        InputProps={inputProps}
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
