import { useUserSearch } from './useUserSearch'
import { SnackbarAlert } from '@/components/Loading/SnackBarAlert'
import {
  Autocomplete,
  CircularProgress,
  PaperProps,
  PopperProps,
  TextField,
  type AutocompleteRenderInputParams,
  Box
} from '@linagora/twake-mui'
import { AttendeeOptionsList } from './AttendeeOptionsList'
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined'
import {
  HTMLAttributes,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type SyntheticEvent
} from 'react'
import { useI18n } from 'twake-i18n'
import { isValidEmail } from '../../utils/isValidEmail'
import { usePasteHandler } from './usePasteHandler'
import { User } from './types'
import { AttendeeChip } from './AttendeeChip'
import { SearchState } from '../Calendar/utils/tempSearchUtil'

export interface ExtendedAutocompleteRenderInputParams extends AutocompleteRenderInputParams {
  error?: boolean
  helperText?: string | null
  placeholder?: string
  label?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export interface PeopleSearchProps {
  selectedUsers: User[]
  onChange: (event: SyntheticEvent, users: User[]) => void
  objectTypes: string[]
  disabled?: boolean
  freeSolo?: boolean
  onToggleEventPreview?: () => void
  placeholder?: string
  inputSlot?: (params: ExtendedAutocompleteRenderInputParams) => ReactNode
  customRenderInput?: (
    params: AutocompleteRenderInputParams,
    query: string,
    setQuery: (value: string) => void
  ) => ReactNode
  customSlotProps?: {
    popper?: Partial<PopperProps>
    paper?: Partial<PaperProps>
    listbox?: Partial<HTMLAttributes<HTMLUListElement>>
  }
  getChipIcon?: (user: User) => ReactElement
  hideOptions?: boolean
  onSearchStateChange?: (state: SearchState) => void
  inputValue?: string
}

export const PeopleSearch: React.FC<PeopleSearchProps> = ({
  selectedUsers,
  onChange,
  objectTypes,
  disabled,
  freeSolo,
  onToggleEventPreview,
  placeholder,
  inputSlot,
  customRenderInput,
  customSlotProps,
  getChipIcon,
  hideOptions,
  onSearchStateChange,
  inputValue
}) => {
  const { t } = useI18n()
  const searchPlaceholder = placeholder ?? t('peopleSearch.placeholder')
  const errorMessage = t('peopleSearch.searchError')

  const lastQueryTimeRef = useRef(0)

  const {
    query,
    setQuery,
    loading,
    options,
    hasSearched,
    isOpen,
    setIsOpen,
    inputError,
    setInputError,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    setSnackbarMessage,
    queryTime
  } = useUserSearch<User>({ objectTypes, errorMessage })

  const onSearchStateChangeRef = useRef(onSearchStateChange)
  useEffect(() => {
    onSearchStateChangeRef.current = onSearchStateChange
  }, [onSearchStateChange])

  useEffect(() => {
    if (!hideOptions) return
    if (queryTime !== lastQueryTimeRef.current) {
      lastQueryTimeRef.current = queryTime
      onSearchStateChangeRef.current?.({ query, options, loading })
    }
  }, [queryTime, query, options, loading, hideOptions])

  useEffect(() => {
    if (inputValue !== undefined) {
      setQuery(inputValue)
    }
  }, [inputValue, setQuery])

  const handleBlurCommit = useCallback(
    (event: React.SyntheticEvent) => {
      const trimmed = query.trim()
      if (!trimmed) return
      if (!isValidEmail(trimmed)) {
        setInputError(
          t('peopleSearch.invalidEmail').replace('%{email}', trimmed)
        )
        return
      }
      if (selectedUsers.find(u => u.email === trimmed)) {
        setQuery('')
        return
      }
      setInputError(null)
      const newUser: User = { email: trimmed, displayName: trimmed }
      onChange(event, [...selectedUsers, newUser])
      setQuery('')
    },
    [query, selectedUsers, onChange, t, setInputError, setQuery]
  )

  const handlePaste = usePasteHandler({
    freeSolo,
    selectedUsers,
    onChange,
    setQuery,
    setInputError,
    t
  })

  const defaultRenderInput = useCallback(
    (params: AutocompleteRenderInputParams) => {
      const inputProps = {
        ...params.InputProps,
        startAdornment: params.InputProps.startAdornment ? (
          params.InputProps.startAdornment
        ) : (
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
          onPaste: handlePaste
        }
      }

      const handleEnterKey = (
        e: React.KeyboardEvent<HTMLInputElement>
      ): void => {
        if (e.key === 'Enter' && onToggleEventPreview) {
          e.preventDefault()
          onToggleEventPreview()
        }
      }

      const defaultTextFieldProps = {
        error: !!inputError,
        helperText: inputError,
        placeholder: searchPlaceholder,
        label: '',
        onKeyDown: handleEnterKey,
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
              label: '',
              onKeyDown: handleEnterKey
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
            size="medium"
            sx={{
              '& .MuiInputBase-input': {
                maxWidth: '90%'
              }
            }}
          />
        </>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      inputError,
      t,
      onToggleEventPreview,
      loading,
      searchPlaceholder,
      handlePaste
    ]
  )

  const isOpenOptions = useMemo(() => {
    if (hideOptions) return false
    if (customRenderInput) {
      return (
        isOpen && !!query && ((loading && hasSearched) || options.length > 0)
      )
    }
    return isOpen && !!query && (loading || hasSearched)
  }, [
    customRenderInput,
    hasSearched,
    hideOptions,
    isOpen,
    loading,
    options.length,
    query
  ])

  return (
    <>
      <Autocomplete
        popupIcon={null}
        freeSolo={freeSolo}
        multiple
        options={options}
        autoComplete={false}
        clearOnBlur={false}
        onBlur={freeSolo ? handleBlurCommit : undefined}
        open={isOpenOptions}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
        disabled={disabled}
        loading={loading}
        filterOptions={x => x}
        fullWidth
        noOptionsText={t('peopleSearch.noResults')}
        loadingText={t('peopleSearch.loading')}
        getOptionLabel={option => {
          if (typeof option === 'object') {
            return option.displayName || option.email
          } else {
            return option
          }
        }}
        sx={{
          '& .MuiAutocomplete-inputRoot.MuiOutlinedInput-root': {
            py: 0,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            flexDirection: 'row'
          },
          '& .MuiInputBase-input': {
            maxWidth: '80%'
          }
        }}
        filterSelectedOptions
        value={selectedUsers}
        inputValue={query}
        onInputChange={(_event, value) => setQuery(value)}
        onChange={(event, value) => {
          const last = value[value.length - 1]
          if (typeof last === 'string' && !isValidEmail(last.trim())) {
            const invalidEmailMessage = t('peopleSearch.invalidEmail').replace(
              '%{email}',
              last
            )
            setInputError(invalidEmailMessage)
            return
          }
          setInputError(null)
          const mapped = value
            .map((v: string | User) =>
              typeof v === 'string'
                ? { email: v.trim(), displayName: v.trim() }
                : v
            )
            .filter(
              (user, index, self) =>
                self.findIndex(u => u.email === user.email) === index
            )
          onChange(event, mapped)
        }}
        slotProps={{
          ...customSlotProps,
          popper: {
            placement: 'bottom-start',
            sx: { minWidth: '300px', ...customSlotProps?.popper?.sx },
            ...customSlotProps?.popper
          }
        }}
        forcePopupIcon={false}
        disableClearable
        renderInput={params =>
          customRenderInput
            ? customRenderInput(params, query, setQuery)
            : defaultRenderInput(params)
        }
        renderOption={(props, option) => (
          <AttendeeOptionsList
            options={[option]}
            selectedUsers={selectedUsers}
            {...props}
          />
        )}
        renderValue={(value, getTagProps) => (
          <Box display="flex" flexWrap="wrap">
            {value.map((option, index) => (
              <AttendeeChip
                key={index}
                option={option}
                getTagProps={getTagProps}
                index={index}
                getChipIcon={getChipIcon}
              />
            ))}
          </Box>
        )}
      />
      <SnackbarAlert
        open={snackbarOpen}
        setOpen={(open: boolean) => {
          setSnackbarOpen(open)
          if (!open) {
            setSnackbarMessage('')
          }
        }}
        message={snackbarMessage}
        severity="error"
      />
    </>
  )
}
