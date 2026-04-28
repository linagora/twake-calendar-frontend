import { useAppSelector } from '@/app/hooks'
import EventPreviewModal from '@/features/Events/EventPreview'
import { Box } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { AttendeesFilter } from './AttendeesFilter'
import { normalizeCalendars } from './calendarColorUtils'
import { OrganizersFilter } from './OrganizersFilter'
import { ResultsList } from './ResultsList'
import { SearchInFilter } from './SearchInFilter'
import './searchResult.styl'
import {
  RenderMobileDate,
  RenderMobileEventCard
} from './searchResultsComponents'
import { SearchEventResult } from './types/SearchEventResult'
import { useEventPreview } from './useEventPreview'

const MobileSearchResultsPage: React.FC = () => {
  const searchResults = useAppSelector(state => state.searchResult)
  const hasSearchParams =
    searchResults.searchParams.search !== '' ||
    searchResults.searchParams.filters.keywords !== '' ||
    searchResults.searchParams.filters.organizers.length > 0 ||
    searchResults.searchParams.filters.attendees.length > 0

  const displaySearch =
    !!searchResults.hits ||
    !!searchResults.error ||
    searchResults.loading ||
    hasSearchParams

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <FiltersButtons />
      {displaySearch && (
        <Box sx={{ m: 2, flex: 1, minHeight: 0, overflow: 'auto' }}>
          <ResultsList
            loading={searchResults.loading}
            error={searchResults.error}
            hits={searchResults.hits}
            results={searchResults.results}
            renderItem={(result, idx) => (
              <MobileResultItem
                key={`row-${idx}-event-${result.data.uid}`}
                eventData={result}
              />
            )}
            noResultsTitleSx={{ variant: 'h5' }}
            noResultsSubtitleSx={{ variant: 'subtitle1' }}
          />
        </Box>
      )}
    </Box>
  )
}

export default MobileSearchResultsPage

const FiltersButtons: React.FC = () => (
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

const MobileResultItem: React.FC<{ eventData: SearchEventResult }> = ({
  eventData
}) => {
  const { t } = useI18n()

  const rawCalendars = useAppSelector(state => state.calendars.list)
  const calendars = normalizeCalendars(rawCalendars)

  const calId = `${eventData.data.userId}/${eventData.data.calendarId}`
  const calendar = calendars[calId]

  const { openPreview, setOpenPreview, handleOpen, timeZone } = useEventPreview(
    eventData,
    calendar
  )

  const startDate = new Date(eventData.data.start)

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '10%',
          gridAutoFlow: 'column',
          gap: 2,
          pt: 1,
          cursor: 'pointer',
          alignItems: 'center',
          textAlign: 'left'
        }}
        onClick={() => void handleOpen()}
      >
        <RenderMobileDate startDate={startDate} t={t} timeZone={timeZone} />
        <RenderMobileEventCard
          eventData={eventData}
          calendar={calendar}
          timeZone={timeZone}
        />
      </Box>

      {calendar?.events?.[eventData.data.uid] && (
        <EventPreviewModal
          eventId={eventData.data.uid}
          calId={calendar.id}
          open={openPreview}
          onClose={() => setOpenPreview(false)}
        />
      )}
    </>
  )
}
