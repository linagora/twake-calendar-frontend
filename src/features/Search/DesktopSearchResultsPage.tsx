import { useAppDispatch, useAppSelector } from '@/app/hooks'
import EventPreviewModal from '@/features/Events/EventPreview'
import { defaultColors } from '@/utils/defaultColors'
import { en } from '@fullcalendar/core/internal-common'
import { Box, Button, IconButton, Typography } from '@linagora/twake-mui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RepeatIcon from '@mui/icons-material/Repeat'
import SquareRoundedIcon from '@mui/icons-material/SquareRounded'
import VideocamIcon from '@mui/icons-material/Videocam'
import { useI18n } from 'twake-i18n'
import { setView } from '../Settings/SettingsSlice'
import { ResultsList } from './ResultsList'
import './searchResult.styl'
import {
  RenderDate,
  RenderDescription,
  RenderLocation,
  RenderOrganizer,
  RenderTime,
  RenderTitle,
  RenderVideoJoin
} from './searchResultsComponents'
import { SearchEventResult } from './types/SearchEventResult'
import { useEventPreview } from './useEventPreview'

export default function DesktopSearchResultsPage(): JSX.Element {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { error, loading, hits, results } = useAppSelector(
    state => state.searchResult
  )

  return (
    <Box className="search-layout">
      <Box className="search-result-content-header">
        <Box className="back-button">
          <IconButton
            onClick={() => dispatch(setView('calendar'))}
            aria-label={t('settings.back')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">{t('search.resultsTitle')}</Typography>
        </Box>
      </Box>

      <ResultsList
        loading={loading}
        error={error}
        hits={hits}
        results={results}
        renderItem={(result, idx) => (
          <DesktopResultItem
            key={`row-${idx}-event-${result.data.uid}`}
            eventData={result}
          />
        )}
        noResultsTitleSx={{
          fontWeight: 500,
          textAlign: 'center',
          color: '#243B55'
        }}
        noResultsSubtitleSx={{ color: 'text.secondary' }}
        stackSx={{ mt: 2 }}
      />
    </Box>
  )
}

function DesktopResultItem({
  eventData
}: {
  eventData: SearchEventResult
}): JSX.Element {
  const { t } = useI18n()
  const startDate = new Date(eventData.data.start)
  const endDate = eventData.data.end ? new Date(eventData.data.end) : startDate

  const calendar = useAppSelector(
    state =>
      state.calendars.list[
        `${eventData.data.userId}/${eventData.data.calendarId}`
      ]
  )
  const calendarColor = calendar?.color?.light

  const { openPreview, setOpenPreview, handleOpen, timeZone } = useEventPreview(
    eventData,
    calendar
  )

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 2,
          p: 3,
          borderTop: '1px solid #F3F6F9',
          cursor: 'pointer',
          '&:hover': { backgroundColor: '#e7e7e7ff' },
          alignItems: 'center',
          textAlign: 'left',
          maxWidth: '80vw'
        }}
        onClick={() => void handleOpen()}
      >
        <RenderDate
          startDate={startDate}
          endDate={endDate}
          t={t}
          timeZone={timeZone}
        />
        <RenderTime
          startDate={startDate}
          endDate={endDate}
          allDay={!!eventData.data.allDay}
          t={t}
          timeZone={timeZone}
        />
        <SquareRoundedIcon
          style={{
            color: calendarColor ?? defaultColors[0].light,
            width: 24,
            height: 24,
            flexShrink: 0
          }}
        />

        <RenderTitle
          summary={eventData.data.summary}
          isRecurrent={!!eventData.data.isRecurrentMaster}
          t={t}
        />
        <RenderOrganizer organizer={eventData.data.organizer} />
        <RenderLocation location={eventData.data.location} />
        <RenderDescription description={eventData.data.description} />
        <RenderVideoJoin
          t={t}
          url={eventData.data['x-openpaas-videoconference']}
        />
      </Box>

      {calendar?.events[eventData.data.uid] && (
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
