import { Box, type AutocompleteRenderInputParams } from '@linagora/twake-mui'
import { useState } from 'react'
import { PeopleSearch } from '../Attendees/PeopleSearch'
import { MobileSearchDialog } from './MobileSearchDialog'
import { SearchTextField } from './MobileSearchFieldText'
import { useFilterSearch } from './useMobileSearch'

const SEARCH_OBJECT_TYPES = ['user', 'contact']

const MobileSearchBar: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    inputQuery,
    setInputQuery,
    searchState,
    selectedContacts,
    filters,
    handleSearch,
    handleSearchChange,
    handleContactSelect,
    clearAll,
    handleShow
  } = useFilterSearch('organizers', setDialogOpen)

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          transition: 'width 0.25s ease-out'
        }}
      >
        <PeopleSearch
          selectedUsers={selectedContacts}
          onChange={(_event, users) => handleContactSelect(users)}
          hideOptions
          inputValue={inputQuery}
          onSearchStateChange={handleSearchChange}
          objectTypes={SEARCH_OBJECT_TYPES}
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
      <MobileSearchDialog
        open={dialogOpen}
        onShow={handleShow}
        showSearchButton={!!inputQuery || filters.organizers.length > 0}
        options={searchState.options ?? []}
        selectedUsers={selectedContacts}
        onOptionClick={user =>
          handleContactSelect([
            ...selectedContacts,
            { displayName: user.displayName, email: user.email }
          ])
        }
      />
    </>
  )
}

export default MobileSearchBar
