import { SnackbarAlert } from '@/components/Loading/SnackBarAlert'
import {
  Autocomplete,
  PaperProps,
  PopperProps,
  Box,
  SxProps,
  type AutocompleteRenderInputParams,
  AutocompleteProps
} from '@linagora/twake-mui'
import { AttendeeOptionsList } from './AttendeeOptionsList'
import {
  HTMLAttributes,
  ReactElement,
  SyntheticEvent,
  type ReactNode
} from 'react'
import { useI18n } from 'twake-i18n'
import { User } from './types'
import { AttendeeChip, type AttendeeChipProps } from './AttendeeChip'
import { SearchState } from '../Calendar/utils/tempSearchUtil'
import {
  usePeopleSearchState,
  normaliseUser,
  dedupeByEmail
} from './usePeopleSearchState'
import {
  PeopleSearchInput,
  type ExtendedAutocompleteRenderInputParams
} from './PeopleSearchInput'

export type { ExtendedAutocompleteRenderInputParams }
export { normaliseUser, dedupeByEmail }

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
  showCurrentUser?: boolean
  onSearchStateChange?: (state: SearchState) => void
  inputValue?: string
  inputStyles?: SxProps
  enableEmailAutocompleteAndCommit?: boolean
}

const autocompleteSx = {
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
}

const getAutocompleteSlotProps = (
  customSlotProps?: PeopleSearchProps['customSlotProps']
): AutocompleteProps<User, true, true, boolean>['slotProps'] => ({
  ...customSlotProps,
  popper: {
    placement: 'bottom-start',
    sx: { minWidth: '300px', ...customSlotProps?.popper?.sx },
    ...customSlotProps?.popper
  }
})

interface PeopleSearchValueRendererProps {
  value: User[]
  getTagProps: AttendeeChipProps['getTagProps']
  getChipIcon?: (user: User) => ReactElement
}

const getOptionLabel = (option: User | string): string => {
  if (typeof option === 'string') return option
  return option.displayName || option.email
}

const resolveIsOpen = ({
  hideOptions,
  isOpen,
  query,
  loading,
  hasSearched,
  options,
  hasCustomRenderInput
}: {
  hideOptions?: boolean
  isOpen: boolean
  query: string
  loading: boolean
  hasSearched: boolean
  options: unknown[]
  hasCustomRenderInput: boolean
}): boolean => {
  if (hideOptions) return false
  if (!isOpen) return false
  if (!query) return false
  if (hasCustomRenderInput) {
    if (loading && hasSearched) return true
    return options.length > 0
  }
  return loading || hasSearched
}

const PeopleSearchValueRenderer: React.FC<PeopleSearchValueRendererProps> = ({
  value,
  getTagProps,
  getChipIcon
}) => (
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
)

interface RenderInputParams {
  params: AutocompleteRenderInputParams
  customRenderInput: PeopleSearchProps['customRenderInput']
  searchState: ReturnType<typeof usePeopleSearchState>
  onToggleEventPreview: PeopleSearchProps['onToggleEventPreview']
  searchPlaceholder: string
  inputSlot: PeopleSearchProps['inputSlot']
  enableEmailAutocompleteAndCommit?: boolean
}

const renderPeopleSearchInput = ({
  params,
  customRenderInput,
  searchState,
  onToggleEventPreview,
  searchPlaceholder,
  inputSlot,
  enableEmailAutocompleteAndCommit
}: RenderInputParams): ReactNode => {
  if (customRenderInput) {
    return customRenderInput(params, searchState.query, searchState.setQuery)
  }
  return (
    <PeopleSearchInput
      params={params}
      loading={searchState.loading}
      handlePaste={searchState.handlePaste}
      onToggleEventPreview={onToggleEventPreview}
      isOpen={searchState.isOpen}
      inputError={searchState.inputError}
      searchPlaceholder={searchPlaceholder}
      inputSlot={inputSlot}
      onKeyDown={
        enableEmailAutocompleteAndCommit ? searchState.handleKeyDown : undefined
      }
    />
  )
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
  showCurrentUser,
  onSearchStateChange,
  inputValue,
  inputStyles,
  enableEmailAutocompleteAndCommit
}) => {
  const { t } = useI18n()
  const searchPlaceholder = placeholder ?? t('peopleSearch.placeholder')

  const searchState = usePeopleSearchState({
    objectTypes,
    showCurrentUser,
    hideOptions,
    onSearchStateChange,
    inputValue,
    selectedUsers,
    onChange,
    freeSolo,
    enableEmailAutocompleteAndCommit
  })

  const isOpenOptions = resolveIsOpen({
    hideOptions,
    isOpen: searchState.isOpen,
    query: searchState.query,
    loading: searchState.loading,
    hasSearched: searchState.hasSearched,
    options: searchState.options,
    hasCustomRenderInput: !!customRenderInput
  })

  return (
    <>
      <Autocomplete
        popupIcon={null}
        freeSolo={freeSolo}
        multiple
        options={searchState.options}
        autoComplete={false}
        clearOnBlur={false}
        onBlur={freeSolo ? searchState.handleBlurCommit : undefined}
        open={isOpenOptions}
        onOpen={() => searchState.setIsOpen(true)}
        onClose={() => searchState.setIsOpen(false)}
        disabled={disabled}
        loading={searchState.loading}
        filterOptions={x => x}
        fullWidth
        noOptionsText={t('peopleSearch.noResults')}
        loadingText={t('peopleSearch.loading')}
        getOptionLabel={getOptionLabel}
        sx={{ ...autocompleteSx, ...inputStyles }}
        filterSelectedOptions
        value={selectedUsers}
        inputValue={searchState.query}
        onInputChange={searchState.handleInputChange}
        onChange={searchState.handleAutocompleteChange}
        slotProps={getAutocompleteSlotProps(customSlotProps)}
        forcePopupIcon={false}
        disableClearable
        renderInput={params =>
          renderPeopleSearchInput({
            params,
            customRenderInput,
            searchState,
            onToggleEventPreview,
            searchPlaceholder,
            inputSlot,
            enableEmailAutocompleteAndCommit
          })
        }
        renderOption={(props, option) => (
          <AttendeeOptionsList
            options={[option]}
            selectedUsers={selectedUsers}
            {...props}
          />
        )}
        renderValue={(value, getTagProps) => (
          <PeopleSearchValueRenderer
            value={value as User[]}
            getTagProps={getTagProps}
            getChipIcon={getChipIcon}
          />
        )}
      />
      <SnackbarAlert
        open={searchState.snackbarOpen}
        setOpen={searchState.handleSnackbarOpenChange}
        message={searchState.snackbarMessage}
        severity="error"
      />
    </>
  )
}
