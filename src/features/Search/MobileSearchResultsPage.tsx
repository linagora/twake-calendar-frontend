import { useAppSelector } from '@/app/hooks'
import {
  getBestColor,
  getTitleStyle
} from '@/components/Event/EventChip/EventChipUtils'
import EventPreviewModal from '@/features/Events/EventPreview'
import { Box, Card, CardHeader, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { AttendeesFilter } from './AttendeesFilter'
import { normalizeCalendars } from './calendarColorUtils'
import { OrganizersFilter } from './OrganizersFilter'
import { ResultsList } from './ResultsList'
import { SearchInFilter } from './SearchInFilter'
import './searchResult.styl'
import { RenderDate, RenderTime } from './searchResultsComponents'
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
    <>
      <FiltersButtons />
      {displaySearch && (
        <Box
          className="search-layout"
          sx={{
            m: 2,
            flex: 1,
            minHeight: 0,
            overflow: 'auto'
          }}
        >
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
    </>
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
  const endDate = eventData.data.end ? new Date(eventData.data.end) : startDate
  const bestColor = getBestColor(calendar?.color)
  const titleStyle = getTitleStyle(bestColor, 'ACCEPTED', calendar, false)

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
        <RenderDate
          startDate={startDate}
          endDate={endDate}
          t={t}
          timeZone={timeZone}
        />

        <Card
          variant="outlined"
          sx={{
            height: 'stretch',
            width: '100%',
            borderRadius: '8px',
            p: 1,
            boxShadow: 'none',
            backgroundColor: calendar?.color.light,
            color: calendar?.color.dark,
            border: '1px solid white',
            display: 'flex'
          }}
          data-testid={`event-card-${eventData.data.uid}`}
        >
          <CardHeader
            sx={{
              p: '0px',
              '& .MuiCardHeader-content': { overflow: 'hidden' }
            }}
            title={
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  width: '100%'
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    minWidth: 0
                  }}
                >
                  <Typography variant="body2" noWrap style={titleStyle}>
                    {eventData.data.summary || t('event.untitled')}
                  </Typography>
                </Box>
              </Box>
            }
            subheader={
              <RenderTime
                startDate={startDate}
                endDate={endDate}
                allDay={!!eventData.data.allDay}
                t={t}
                timeZone={timeZone}
              />
            }
          />
        </Card>
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
