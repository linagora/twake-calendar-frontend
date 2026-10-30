import React from 'react'
import { isVisibleInRange } from './scheduleEventRange'
import { EventContentArg } from '@fullcalendar/core'
import { Box, useTheme } from '@linagora/twake-mui'
import SquareRoundedIcon from '@mui/icons-material/SquareRounded'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@common/app/hooks'
import { getEffectiveColor } from './EventChipUtils'
import {
  RenderOrganizer,
  RenderVideoJoin,
  RenderTitle,
  RenderLocation,
  RenderDescription
} from '@common/features/Search/searchResultsComponents'
import {
  RenderDayIndicator,
  RenderListEventTime
} from '@common/features/Search/listSearchResultsComponents'
import { type EventChipScheduleProps } from './EventChipSchedule'

export interface DesktopEventChipScheduleProps extends EventChipScheduleProps {
  arg: EventContentArg
  calendars: Record<string, Calendar>
  tempcalendars: Record<string, Calendar>
  timezone: string
  dayData: {
    isFirstRow: boolean
    isToday: boolean
    dayNum: string
    dayName: string
  }
  upcommingEventId?: string
}

export const DesktopEventChipSchedule: React.FC<
  DesktopEventChipScheduleProps
> = ({ arg, timezone, dayData, upcommingEventId }) => {
  const { t } = useI18n()
  const theme = useTheme()
  const ext = arg.event.extendedProps as CalendarEvent
  const calendarColor = useScheduleCalendarColor(arg, ext.calId)
  const { hasDetails, hasVideo, gridTemplateColumns } = getScheduleColumns(arg)
  const startDate = arg.event.start || new Date()
  const endDate = arg.event.end || startDate

  return (
    <Box
      data-event-id={ext.uid}
      sx={{
        ...rowSx,
        gridTemplateColumns,
        backgroundColor:
          upcommingEventId === ext.uid
            ? theme.vars.palette.action.hover
            : 'transparent'
      }}
    >
      <RenderDayIndicator {...dayData} />
      <RenderListEventTime
        allDay={arg.event.allDay}
        startDate={startDate}
        endDate={endDate}
        timeZone={timezone}
        t={t}
        isStart={arg.isStart}
        isEnd={arg.isEnd}
      />
      <SquareRoundedIcon
        style={{ color: calendarColor, width: 24, height: 24, flexShrink: 0 }}
      />
      <RenderTitle
        summary={arg.event.title}
        isRecurrent={!!ext.repetition}
        t={t}
      />
      <Box sx={secondaryColumnsSx}>
        <RenderOrganizer organizer={ext.organizer} />
      </Box>
      {hasDetails && (
        <Box sx={secondaryColumnsSx}>
          <RenderLocation text={ext.location} />
          <RenderDescription text={ext.description} />
        </Box>
      )}
      {hasVideo && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <RenderVideoJoin t={t} url={ext.x_openpass_videoconference} />
        </Box>
      )}
    </Box>
  )
}

const useScheduleCalendarColor = (
  arg: EventContentArg,
  calId: string
): string => {
  const theme = useTheme()
  const calendars = useAppSelector(state => state.calendars.list)
  const tempcalendars = useAppSelector(state => state.calendars.templist)
  const bookingLinks = useAppSelector(state => state.bookingLinks.list)

  const { temp, colors, bookingLinkPublicId } = arg.event._def.extendedProps
  const calendar = (temp ? tempcalendars : calendars)[calId]
  const bookingLinkColor = bookingLinks?.find(
    bl => bl.publicId === bookingLinkPublicId
  )?.color

  return getEffectiveColor(
    theme,
    calendar,
    colors as Record<string, string> | string | undefined,
    bookingLinkColor
  ).light
}

// Use the same tracks for every event in the displayed schedule range.
const getScheduleColumns = (
  arg: EventContentArg
): {
  hasDetails: boolean
  hasVideo: boolean
  gridTemplateColumns: string
} => {
  const visibleEvents = arg.view.calendar
    .getEvents()
    .filter(e => isVisibleInRange(e, arg.view.activeStart, arg.view.activeEnd))
  const hasDetails = visibleEvents.some(
    e => e.extendedProps.location || e.extendedProps.description
  )
  const hasVideo = visibleEvents.some(
    e => e.extendedProps.x_openpass_videoconference
  )
  const gridTemplateColumns = [
    '80px 120px 24px minmax(240px, 1fr) minmax(80px, 180px)',
    hasDetails ? 'minmax(80px, 20%)' : '',
    hasVideo ? '100px' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return { hasDetails, hasVideo, gridTemplateColumns }
}

const rowSx = {
  display: 'grid',
  gap: 2,
  alignItems: 'center',
  textAlign: 'left',
  width: '100%',
  boxSizing: 'border-box',
  p: 3
}

const secondaryColumnsSx = {
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  '& > *': {
    flex: '0 1 auto',
    minWidth: 0,
    maxWidth: '100%'
  }
}
