import { useFilterEventAttendees } from '@common/components/Event/hooks/useFilterEventAttendees'
import { renderAttendeeBadge } from '@common/components/Event/utils/eventUtils'
import { CalendarEvent } from '@common/types/EventsTypes'
import { Box, SxProps, Theme } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import {
  EventAlarmRow,
  EventDescriptionRow,
  EventErrorRow,
  EventLocationRow,
  EventRepetitionRow,
  EventResourceRow,
  EventVideoRow
} from './EventDetailsRows'
import { EventPreviewAttendees } from './EventPreviewAttendees'
import { PrivateEventPreview } from './PrivateEventPreview'

export interface EventPreviewDetailsProps {
  event: CalendarEvent
  isOwn: boolean
  isNotPrivate: boolean
  isResourceEventPreview?: boolean
  calendarName?: string
  ownerEmail?: string
  isTeamCalendar?: boolean
}

export const infoIconSx = (theme: Theme): SxProps<Theme> => ({
  minWidth: '25px',
  marginRight: 2,
  color: theme.vars.palette.text.primary,
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'center'
})

export const EventPreviewDetails: React.FC<EventPreviewDetailsProps> = ({
  event,
  isOwn,
  isNotPrivate,
  isResourceEventPreview,
  calendarName,
  ownerEmail,
  isTeamCalendar
}) => {
  const { t } = useI18n()
  const { resources, eventAttendees, attendees, organizer, organizerSentBy } =
    useFilterEventAttendees({
      event,
      isResourceEventPreview,
      calendarName
    })

  const showDetails = isNotPrivate || isOwn

  const shouldShowAttendeesSection =
    !isResourceEventPreview &&
    (attendees.length > 0 || Boolean(organizer.cal_address || organizer?.cn))

  if (!showDetails) {
    return <PrivateEventPreview />
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        flexDirection: 'column'
      }}
    >
      <EventVideoRow meetingLink={event.x_openpass_videoconference} />

      {isResourceEventPreview &&
        organizer &&
        renderAttendeeBadge({
          a: organizer,
          key: 'org',
          t,
          isFull: true,
          isOrganizer: true,
          isTeamCalendar,
          sentBy: organizerSentBy
        })}

      {shouldShowAttendeesSection && (
        <EventPreviewAttendees
          attendees={attendees}
          organizer={organizer}
          organizerSentBy={organizerSentBy}
          allAttendees={eventAttendees ?? []}
          start={event.start}
          end={event.end}
          timezone={event.timezone}
          eventUid={event.uid}
          isTeamCalendar={isTeamCalendar}
          teamCalendarId={event.teamCalendarId}
        />
      )}

      <EventLocationRow location={event.location} />

      <EventResourceRow resources={resources} />

      <EventDescriptionRow
        description={event.description}
        attach={event.attach}
      />

      <EventAlarmRow alarms={event.alarms} ownerEmail={ownerEmail} />

      <EventRepetitionRow repetition={event.repetition} />

      <EventErrorRow error={event.error} />
    </Box>
  )
}
