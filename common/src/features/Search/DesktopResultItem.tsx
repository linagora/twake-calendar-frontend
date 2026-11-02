import { useAppSelector } from '@common/app/hooks'
import EventPreviewModal from '@common/components/EventPreview'
import { Calendar } from '@common/types/CalendarTypes'
import { defaultColors } from '@common/utils/defaultColors'
import { Box, useTheme } from '@linagora/twake-mui'
import SquareRoundedIcon from '@mui/icons-material/SquareRounded'
import { useI18n } from 'twake-i18n'
import { SearchEventResult } from './types/SearchEventResult'
import { useEventPreview } from './useEventPreview'
import {
  dayZoneOf,
  ownerPartstatOf,
  RenderDate,
  RenderLocation,
  RenderDescription,
  RenderOrganizer,
  RenderTime,
  RenderTitle,
  RenderVideoJoin
} from './searchResultsComponents'
import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import {
  calendarLabel,
  eventAccessibleLabel
} from '@common/components/Event/utils/eventAccessibleLabel'

interface DesktopResultItemProps {
  eventData: SearchEventResult
  hasDetails: boolean
  hasVideo: boolean
}

export default function DesktopResultItem({
  eventData,
  hasDetails,
  hasVideo
}: DesktopResultItemProps): JSX.Element {
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
  const userId = useAppSelector(state => state.user.userData?.openpaasId)

  const { openPreview, setOpenPreview, handleOpen, timeZone } = useEventPreview(
    eventData,
    calendar
  )

  return (
    <>
      <Box
        sx={{
          ...rowSx,
          gridTemplateColumns: gridTemplateColumns(hasDetails, hasVideo),
          '&:hover': { backgroundColor: theme.vars.palette.action.hover }
        }}
        role="button"
        tabIndex={0}
        aria-label={eventAccessibleLabel({
          title: eventData.data.summary,
          start: startDate,
          end: endDate,
          allDay: !!eventData.data.allDay,
          calendarName: calendarLabel(calendar, userId, t),
          partstat: ownerPartstatOf(calendar, eventData.data),
          timeZone,
          t
        })}
        onClick={() => void handleOpen()}
        onKeyDown={onActivateKey(handleOpen)}
      >
        <DesktopResultColumns
          eventData={eventData}
          startDate={startDate}
          endDate={endDate}
          calendarColor={calendarColorOf(calendar)}
          timeZone={timeZone}
          hasDetails={hasDetails}
          hasVideo={hasVideo}
        />
      </Box>

      {calendar?.events?.[eventData.data.uid] && (
        <EventPreviewModal
          eventId={eventData.data.uid}
          calId={calendar.id}
          open={openPreview}
          onClose={() => setOpenPreview(false)}
          currentView={CALENDAR_VIEWS.listWeek}
        />
      )}
    </>
  )
}

interface DesktopResultColumnsProps extends DesktopResultItemProps {
  startDate: Date
  endDate: Date
  calendarColor: string
  timeZone: string
}

function DesktopResultColumns({
  eventData,
  startDate,
  endDate,
  calendarColor,
  timeZone,
  hasDetails,
  hasVideo
}: DesktopResultColumnsProps): JSX.Element {
  const { t } = useI18n()
  const allDay = !!eventData.data.allDay

  return (
    <>
      <Box sx={dateColumnSx}>
        <RenderDate
          startDate={startDate}
          endDate={endDate}
          allDay={allDay}
          t={t}
          timeZone={dayZoneOf(allDay, timeZone)}
        />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <RenderTime
          startDate={startDate}
          endDate={endDate}
          allDay={allDay}
          t={t}
          timeZone={timeZone}
        />
      </Box>
      <SquareRoundedIcon style={colorIconStyle(calendarColor)} />
      <RenderTitle
        summary={eventData.data.summary}
        isRecurrent={!!eventData.data.isRecurrentMaster}
        t={t}
      />
      <Box sx={secondaryColumnsSx}>
        <RenderOrganizer organizer={eventData.data.organizer} />
      </Box>
      {hasDetails && (
        <Box sx={secondaryColumnsSx}>
          <RenderLocation text={eventData.data.location} />
          <RenderDescription text={eventData.data.description} />
        </Box>
      )}
      {hasVideo && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <RenderVideoJoin
            t={t}
            url={eventData.data['x-openpaas-videoconference']}
          />
        </Box>
      )}
    </>
  )
}

const colorIconStyle = (color: string): React.CSSProperties => ({
  color,
  width: 24,
  height: 24,
  flexShrink: 0
})

const gridTemplateColumns = (hasDetails: boolean, hasVideo: boolean): string =>
  [
    '130px 120px 24px minmax(240px, 1fr) minmax(80px, 160px)',
    hasDetails ? 'minmax(80px, 20%)' : '',
    hasVideo ? '100px' : ''
  ]
    .filter(Boolean)
    .join(' ')

const calendarColorOf = (calendar: Calendar | undefined): string =>
  calendar?.color?.light ?? defaultColors[0].light

const onActivateKey =
  (onActivate: () => Promise<void>) =>
  (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      void onActivate()
    }
  }

const rowSx = {
  display: 'grid',
  gap: 2,
  p: 3,
  borderTop: '1px solid',
  borderColor: 'divider',
  cursor: 'pointer',
  alignItems: 'center',
  textAlign: 'left'
}

const dateColumnSx = {
  width: '130px',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start'
}

const secondaryColumnsSx = {
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 1
}
