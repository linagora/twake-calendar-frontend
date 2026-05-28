import React from 'react'
import { EventContentArg } from '@fullcalendar/core'
import { alpha, Box, useTheme } from '@linagora/twake-mui'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { type EventChipScheduleProps } from './EventChipSchedule'
import {
  RenderDayIndicator,
  RenderListEventTime
} from '@/features/Search/listSearchResultsComponents'
import { RenderMobileEventCard } from '@/features/Search/mobileSearchResultsComponents'
import { SearchEventResult } from '@/features/Search/types/SearchEventResult'
import { useI18n } from 'twake-i18n'

export interface MobileEventChipScheduleProps extends EventChipScheduleProps {
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

const parseEventToSearchResult = (
  arg: EventContentArg,
  ext: CalendarEvent,
  videoUrl: string | undefined
): SearchEventResult => {
  const eventData: SearchEventResult = {
    data: {
      uid: ext.uid || arg.event.id || '',
      userId: '',
      calendarId: ext.calId || '',
      start: (arg.event.start ?? new Date()).toISOString(),
      end: arg.event.end ? arg.event.end.toISOString() : undefined,
      allDay: arg.event.allDay,
      summary: arg.event.title,
      description: ext.description,
      location: ext.location,
      ['x-openpaas-videoconference']: videoUrl
    },
    _links: {
      self: {
        href: ''
      }
    }
  }
  return eventData
}

export const MobileEventChipSchedule: React.FC<
  MobileEventChipScheduleProps
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
  const calendarsSource = temp ? tempcalendars : calendars
  const calendar = calendarsSource[ext.calId]
  const videoUrl = ext.x_openpass_videoconference

  if (!calendar) return null

  const eventData: SearchEventResult = parseEventToSearchResult(
    arg,
    ext,
    videoUrl
  )

  return (
    <Box
      data-event-id={ext.uid}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        textAlign: 'left',
        width: '100%',
        py: 0.5,
        px: 1,
        backgroundColor:
          upcommingEventId === ext.uid
            ? alpha(theme.palette.grey[200], 0.5)
            : 'transparent'
      }}
    >
      <RenderDayIndicator {...dayData} isMobile={true} />
      <RenderMobileEventCard
        eventData={eventData}
        calendar={calendar}
        timeZone={timezone}
        customSubHeader={(titleStyle: React.CSSProperties) => (
          <RenderListEventTime
            allDay={arg.event.allDay}
            startDate={arg.event.start || new Date()}
            endDate={arg.event.end || arg.event.start || new Date()}
            timeZone={timezone}
            t={t}
            isStart={arg.isStart}
            isEnd={arg.isEnd}
            styles={{
              color: titleStyle.color,
              opacity: '70%',
              fontWeight: '500',
              fontSize: '10px',
              lineHeight: '16px',
              letterSpacing: '0%',
              verticalAlign: 'middle'
            }}
          />
        )}
      />
    </Box>
  )
}
