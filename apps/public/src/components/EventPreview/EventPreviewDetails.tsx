import { useFilterEventAttendees } from '@common/components/Event/hooks/useFilterEventAttendees'
import { renderAttendeeBadge } from '@common/components/Event/utils/eventUtils'
import {
  EventAlarmRow,
  EventDescriptionRow,
  EventErrorRow,
  EventLocationRow,
  EventRepetitionRow,
  EventVideoRow
} from '@common/components/EventPreview/EventDetailsRows'
import { EventPreviewDetailsProps } from '@common/components/EventPreview/EventPreviewDetails'
import { PrivateEventPreview } from '@common/components/EventPreview/PrivateEventPreview'
import { Box } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { EventPreviewAttendees } from './EventPreviewAttendees'

export const EventPreviewDetails: React.FC<EventPreviewDetailsProps> = ({
  event,
  isOwn,
  isNotPrivate,
  isResourceEventPreview,
  calendarName
}) => {
  const { t } = useI18n()

  const { attendees, organizer } = useFilterEventAttendees({
    event,
    isResourceEventPreview,
    calendarName
  })

  const shouldShowAttendeesSection =
    !isResourceEventPreview &&
    (attendees.length > 0 || Boolean(organizer.cal_address || organizer.cn))

  if (!(isNotPrivate || isOwn)) {
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

      <EventLocationRow location={event.location} />

      <EventDescriptionRow description={event.description} />

      <EventAlarmRow alarms={event.alarms} />

      <EventRepetitionRow repetition={event.repetition} />

      {isResourceEventPreview &&
        organizer &&
        renderAttendeeBadge({
          a: organizer,
          key: 'org',
          t,
          isFull: true,
          isOrganizer: true,
          isPublic: true
        })}

      {shouldShowAttendeesSection && (
        <EventPreviewAttendees
          attendees={attendees}
          organizer={organizer}
          allAttendees={event.attendee ?? []}
          start={event.start}
          end={event.end}
          timezone={event.timezone}
          eventUid={event.uid}
        />
      )}

      <EventErrorRow error={event.error} />
    </Box>
  )
}
