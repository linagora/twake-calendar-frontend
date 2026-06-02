import { useFilterEventAttendees } from '@common/components/Event/hooks/useFilterEventAttendees'
import { renderAttendeeBadge } from '@common/components/Event/utils/eventUtils'
import { CalendarEvent } from '@common/types/EventsTypes'
import { alpha, Box, SxProps, Theme } from '@linagora/twake-mui'
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
}

export const infoIconSx = (theme: Theme): SxProps<Theme> => ({
  minWidth: '25px',
  marginRight: 2,
  color: alpha(theme.palette.grey[900], 0.9),
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'center'
})

export const EventPreviewDetails: React.FC<EventPreviewDetailsProps> = ({
  event,
  isOwn,
  isNotPrivate,
  isResourceEventPreview,
  calendarName
}) => {
  const { t } = useI18n()

  const { resources, eventAttendees, attendees, organizer } =
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
        renderAttendeeBadge(organizer, 'org', t, true, true)}

      {shouldShowAttendeesSection && (
        <EventPreviewAttendees
          attendees={attendees}
          organizer={organizer}
          allAttendees={eventAttendees ?? []}
          start={event.start}
          end={event.end}
          timezone={event.timezone}
          eventUid={event.uid}
        />
      )}

      <EventLocationRow location={event.location} />

      <EventResourceRow resources={resources} />

      <EventDescriptionRow
        description={event.description}
        attach={event.attach}
      />

      <EventAlarmRow alarm={event.alarm} />

      <EventRepetitionRow repetition={event.repetition} />

      <EventErrorRow error={event.error} />
    </Box>
  )
}
