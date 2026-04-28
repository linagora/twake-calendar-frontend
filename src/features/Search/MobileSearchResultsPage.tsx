import { useAppSelector } from '@/app/hooks'
import { Box } from '@linagora/twake-mui'
import { AttendeesFilter } from './AttendeesFilter'
import DesktopSearchResultsPage from './DesktopSearchResultsPage'
import { OrganizersFilter } from './OrganizersFilter'
import { SearchInFilter } from './SearchInFilter'
import './searchResult.styl'

const MobileSearchResultsPage: React.FC = () => {
  const searchResults = useAppSelector(state => state.searchResult)
  const hasSearchParams =
    searchResults.searchParams.search !== '' ||
    searchResults.searchParams.filters.keywords !== '' ||
    searchResults.searchParams.filters.organizers.length > 0 ||
    searchResults.searchParams.filters.attendees.length > 0

  const displaySearch =
    (!!searchResults.hits || !!searchResults.error || searchResults.loading) &&
    hasSearchParams

  return (
    <>
      <FiltersButtons />
      {displaySearch && <DesktopSearchResultsPage />}
    </>
  )
}

export default MobileSearchResultsPage

const FiltersButtons: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        overflowX: 'auto',
        gap: 2,
        px: 2,
        py: 1,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        backgroundColor: '#FFF',
        minHeight: '48px'
      }}
    >
      <SearchInFilter mode="mobile" />
      <OrganizersFilter mode="mobile" />
      <AttendeesFilter mode="mobile" />
    </Box>
  )
}
