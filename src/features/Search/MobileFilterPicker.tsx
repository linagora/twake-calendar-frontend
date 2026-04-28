import { AttendeeOptionsList } from '@/components/Attendees/AttendeeOptionsList'
import { PeopleSearch } from '@/components/Attendees/PeopleSearch'
import { User } from '@/components/Attendees/types'
import { SearchState } from '@/components/Calendar/utils/tempSearchUtil'
import { SearchTextField } from '@/components/Menubar/MobileSearchFieldText'
import { UseFilterSearchResult } from '@/components/Menubar/useMobileSearch'
import { MobileSelector } from '@/components/MobileSelector'
import {
  AutocompleteRenderInputParams,
  Box,
  SwipeableDrawer
} from '@linagora/twake-mui'
import { useEffect, useRef } from 'react'

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
  objectTypes
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

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
      {searchState.options && searchState.options.length > 0 && (
        <Box sx={{ flex: 1, m: 1 }}>
          <AttendeeOptionsList
            options={searchState.options}
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
      fullscreen
      bottomSheetChildren={({ open, onClose }) => (
        <FilterDrawer
          open={open}
          onClose={onClose}
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
