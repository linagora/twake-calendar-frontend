import { useAppSelector } from '@common/app/hooks'
import EventPreviewModal from '@common/components/EventPreview'
import { defaultColors } from '@common/utils/defaultColors'
import { alpha, Box, useTheme } from '@linagora/twake-mui'
import SquareRoundedIcon from '@mui/icons-material/SquareRounded'
import { useI18n } from 'twake-i18n'
import { SearchEventResult } from './types/SearchEventResult'
import { useEventPreview } from './useEventPreview'
import {
  RenderDate,
  RenderLocation,
  RenderDescription,
  RenderOrganizer,
  RenderTime,
  RenderTitle,
  RenderVideoJoin
} from './searchResultsComponents'

export default function DesktopResultItem({
  eventData
}: {
  eventData: SearchEventResult
}): JSX.Element {
  const { t } = useI18n()
  const theme = useTheme()
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
          borderTop: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          '&:hover': { backgroundColor: alpha(theme.palette.grey[200], 0.5) },
          alignItems: 'center',
          textAlign: 'left'
        }}
        role="button"
        tabIndex={0}
        aria-label={eventData.data.summary}
        onClick={() => void handleOpen()}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            void handleOpen()
          }
        }}
      >
        <Box display="flex" alignItems="center" sx={{ minWidth: '225px' }}>
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
        </Box>
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
        <RenderLocation text={eventData.data.location} />
        <RenderDescription text={eventData.data.description} />
        <RenderVideoJoin
          t={t}
          url={eventData.data['x-openpaas-videoconference']}
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
