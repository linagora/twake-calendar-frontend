import { AttendeeOptionsList } from '@/components/Attendees/AttendeeOptionsList'
import { PeopleSearch } from '@/components/Attendees/PeopleSearch'
import { User } from '@/components/Attendees/types'
import { SearchState } from '@/components/Calendar/utils/tempSearchUtil'
import { SearchTextField } from '@/components/Menubar/MobileSearchFieldText'
import { UseFilterSearchResult } from '@/components/Menubar/useMobileSearch'
import {
  MobileSelector,
  MobileSelectorHandle
} from '@/components/MobileSelector'
import { SearchFilters } from '@/features/Search/SearchSlice'
import { AutocompleteRenderInputParams, Box } from '@linagora/twake-mui'
import { useRef } from 'react'

interface MobileFilterPickerProps {
  displayText: string
  searchState: SearchState
  selectedContacts: User[]
  filters: SearchFilters
  inputQuery: string
  setInputQuery: React.Dispatch<React.SetStateAction<string>>
  handleSearch: UseFilterSearchResult['handleSearch']
  handleSearchChange: UseFilterSearchResult['handleSearchChange']
  handleContactSelect: UseFilterSearchResult['handleContactSelect']
  clearAll: UseFilterSearchResult['clearAll']
  objectTypes?: string[]
}

export const MobileFilterPicker: React.FC<MobileFilterPickerProps> = ({
  displayText,
  searchState,
  selectedContacts,
  filters,
  inputQuery,
  setInputQuery,
  handleSearch,
  handleSearchChange,
  handleContactSelect,
  clearAll,
  objectTypes = ['user', 'resources']
}) => {
  const selectorRef = useRef<MobileSelectorHandle>(null)

  return (
    <MobileSelector
      ref={selectorRef}
      displayText={selectedContacts[0]?.displayName ?? displayText}
    >
      <Box sx={{ p: 2 }}>
        <PeopleSearch
          selectedUsers={selectedContacts}
          onChange={(_event, users) => handleContactSelect(users)}
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
              params={params}
              query={query}
              setQuery={setQuery}
              selectedContacts={selectedContacts}
              onQueryChange={setInputQuery}
              onEnter={() => void handleSearch(query, filters)}
              onClear={clearAll}
            />
          )}
        />
      </Box>
      {searchState.options && searchState.options?.length > 0 && (
        <Box sx={{ flex: 1, m: 1, overflowY: 'auto' }}>
          <AttendeeOptionsList
            options={searchState.options}
            selectedUsers={selectedContacts}
            onOptionClick={user =>
              handleContactSelect([
                ...selectedContacts,
                { displayName: user.displayName, email: user.email }
              ])
            }
          />
        </Box>
      )}
    </MobileSelector>
  )
}
