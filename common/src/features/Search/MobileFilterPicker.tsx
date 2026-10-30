import { AttendeeOptionsList } from '@common/components/Attendees/AttendeeOptionsList'
import { PeopleSearch } from '@common/components/Attendees/PeopleSearch'
import { User } from '@common/components/Attendees/types'
import {
  hasFoundNothing,
  SearchState
} from '@common/components/Calendar/utils/tempSearchUtil'
import { SearchTextField } from '@common/components/Menubar/MobileSearchFieldText'
import { UseFilterSearchResult } from '@common/components/Menubar/useMobileSearch'
import { MobileSelector } from '@common/components/MobileSelector'
import {
  AutocompleteRenderInputParams,
  Box,
  SwipeableDrawer
} from '@linagora/twake-mui'
import { useEffect, useRef } from 'react'
import { useI18n } from 'twake-i18n'

interface MobileFilterPickerProps {
  displayText: string
  searchState: SearchState
  selectedContacts: User[]
  inputQuery: string
  setInputQuery: React.Dispatch<React.SetStateAction<string>>
  handleSearchChange: UseFilterSearchResult['handleSearchChange']
  handleContactSelect: UseFilterSearchResult['handleContactSelect']
  clearAll: UseFilterSearchResult['clearAll']
  objectTypes?: string[]
}

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  searchState: SearchState
  selectedContacts: User[]
  inputQuery: string
  setInputQuery: React.Dispatch<React.SetStateAction<string>>
  handleSearchChange: UseFilterSearchResult['handleSearchChange']
  handleContactSelect: UseFilterSearchResult['handleContactSelect']
  clearAll: UseFilterSearchResult['clearAll']
  objectTypes: string[]
  label?: string
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({
  open,
  onClose,
  searchState,
  selectedContacts,
  inputQuery,
  setInputQuery,
  handleSearchChange,
  handleContactSelect,
  clearAll,
  objectTypes,
  label
}) => {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const foundNothing = hasFoundNothing(searchState)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={(): void => {}}
      slotProps={{
        paper: {
          'aria-label': label,
          sx: { height: '100dvh' }
        }
      }}
    >
      <Box sx={{ p: 2 }}>
        <PeopleSearch
          selectedUsers={selectedContacts}
          onChange={(_event, users) => {
            handleContactSelect(users)
            onClose()
          }}
          hideOptions
          showCurrentUser
          inputValue={inputQuery}
          onSearchStateChange={handleSearchChange}
          objectTypes={objectTypes}
          onToggleEventPreview={() => {}}
          customRenderInput={(
            params: AutocompleteRenderInputParams,
            query: string,
            setQuery
          ) => (
            <SearchTextField
              params={{ ...params }}
              inputRef={inputRef}
              query={query}
              setQuery={setQuery}
              selectedContacts={selectedContacts}
              onQueryChange={setInputQuery}
              onEnter={() => {}}
              onClear={clearAll}
            />
          )}
        />
      </Box>
      {(!!searchState.options?.length || foundNothing) && (
        <Box sx={{ flex: 1, m: 1 }}>
          <AttendeeOptionsList
            options={searchState.options ?? []}
            noResultsText={
              foundNothing ? t('peopleSearch.noResults') : undefined
            }
            selectedUsers={selectedContacts}
            onOptionClick={user => {
              handleContactSelect([
                ...selectedContacts,
                { displayName: user.displayName, email: user.email }
              ])
              onClose()
            }}
          />
        </Box>
      )}
    </SwipeableDrawer>
  )
}

export const MobileFilterPicker: React.FC<MobileFilterPickerProps> = ({
  displayText,
  searchState,
  selectedContacts,
  inputQuery,
  setInputQuery,
  handleSearchChange,
  handleContactSelect,
  clearAll,
  objectTypes = ['user', 'resources']
}) => {
  return (
    <MobileSelector
      displayText={selectedContacts[0]?.displayName ?? displayText}
      label={displayText}
      fullscreen
      bottomSheetChildren={({ open, onClose, label }) => (
        <FilterDrawer
          open={open}
          onClose={onClose}
          label={label}
          searchState={searchState}
          selectedContacts={selectedContacts}
          inputQuery={inputQuery}
          setInputQuery={setInputQuery}
          handleSearchChange={handleSearchChange}
          handleContactSelect={handleContactSelect}
          clearAll={clearAll}
          objectTypes={objectTypes}
        />
      )}
    />
  )
}
