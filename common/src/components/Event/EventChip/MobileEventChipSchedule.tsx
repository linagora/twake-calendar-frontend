import React from 'react'
import { EventContentArg } from '@fullcalendar/core'
import { alpha, Box, useTheme } from '@linagora/twake-mui'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { type EventChipScheduleProps } from './EventChipSchedule'
import {
  RenderDayIndicator,
  RenderListEventTime
} from '@common/features/Search/listSearchResultsComponents'
import { RenderMobileEventCard } from '@common/features/Search/mobileSearchResultsComponents'
import { SearchEventResult } from '@common/features/Search/types/SearchEventResult'
import { useI18n } from 'twake-i18n'
import { getEffectiveColor } from './EventChipUtils'
import { useAppSelector } from '@common/app/hooks'
import { buttonLikeProps } from '@common/utils/keyboardActivation'

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
> = ({ arg, timezone, dayData, upcommingEventId }) => {
  const { t } = useI18n()
  const theme = useTheme()
  const calendars = useAppSelector(state => state.calendars.list)
  const tempcalendars = useAppSelector(state => state.calendars.templist)

  const ext = arg.event.extendedProps as CalendarEvent
  const { temp, colors, bookingLinkPublicId } = arg.event._def.extendedProps
  const calendarsSource = temp ? tempcalendars : calendars
  const calendar = calendarsSource[ext.calId]
  const videoUrl = ext.x_openpass_videoconference

  const bookingLinks = useAppSelector(state => state.bookingLinks.list)
  const bookingLinkColor = bookingLinks?.find(
    bl => bl.publicId === bookingLinkPublicId
  )?.color

  const effectiveColor = getEffectiveColor(
    theme,
    calendar,
    colors as Record<string, string> | string | undefined,
    bookingLinkColor
  )

  if (!calendar) return null

  const eventData: SearchEventResult = parseEventToSearchResult(
    arg,
    ext,
    videoUrl
  )

  return (
    // Replaces FullCalendar's focusable link: the click bubbles up to the
    // eventClick handler
    <Box
      {...buttonLikeProps}
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
        effectiveColor={effectiveColor}
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
