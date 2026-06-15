import React from 'react'
import { EventContentArg } from '@fullcalendar/core'
import { alpha, Box, useTheme } from '@linagora/twake-mui'
import SquareRoundedIcon from '@mui/icons-material/SquareRounded'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useI18n } from 'twake-i18n'
import { defaultColors } from '@common/utils/defaultColors'
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
> = ({
  arg,
  calendars,
  tempcalendars,
  timezone,
  dayData,
  upcommingEventId
}) => {
  const { t } = useI18n()
  const theme = useTheme()

  const ext = arg.event.extendedProps as CalendarEvent
  const { temp } = arg.event._def.extendedProps
  const isRecurrent = !!ext.repetition
  const videoUrl = ext.x_openpass_videoconference
  const calendarsSource = temp ? tempcalendars : calendars
  const calendar = calendarsSource[ext.calId]
  const calendarColor = calendar?.color?.light ?? defaultColors[0].light

  return (
    <Box
      data-event-id={ext.uid}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 2,
        alignItems: 'center',
        textAlign: 'left',
        width: '100%',
        p: 3,
        backgroundColor:
          upcommingEventId === ext.uid
            ? alpha(theme.palette.grey[200], 0.5)
            : 'transparent'
      }}
    >
      <RenderDayIndicator {...dayData} />
      <RenderListEventTime
        allDay={arg.event.allDay}
        startDate={arg.event.start || new Date()}
        endDate={arg.event.end || arg.event.start || new Date()}
        timeZone={timezone}
        t={t}
        isStart={arg.isStart}
        isEnd={arg.isEnd}
      />
      <SquareRoundedIcon
        style={{ color: calendarColor, width: 24, height: 24, flexShrink: 0 }}
      />
      <RenderTitle summary={arg.event.title} isRecurrent={isRecurrent} t={t} />
      <RenderOrganizer organizer={ext.organizer} />
      <RenderLocation text={ext.location} />
      <RenderDescription text={ext.description} />
      <Box sx={{ ml: 'auto', flexShrink: 0 }}>
        <RenderVideoJoin t={t} url={videoUrl} />
      </Box>
    </Box>
  )
}
