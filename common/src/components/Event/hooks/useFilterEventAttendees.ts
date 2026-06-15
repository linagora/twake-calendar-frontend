import { userAttendee } from '@common/features/User/models/attendee'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useMemo } from 'react'

const isResourceAttendee = (attendee: userAttendee): boolean =>
  attendee.cutype === 'RESOURCE'

const isEventOfResource = (
  attendee: userAttendee,
  calendarName?: string,
  isResourceEventPreview?: boolean
): boolean =>
  (isResourceEventPreview && calendarName !== attendee.cn) ||
  !isResourceEventPreview

export const useFilterEventAttendees = ({
  event,
  isResourceEventPreview,
  calendarName
}: {
  event: CalendarEvent
  isResourceEventPreview?: boolean
  calendarName?: string
}): {
  resources: userAttendee[]
  eventAttendees: userAttendee[]
  attendees: userAttendee[]
  organizer: userAttendee
} => {
  const rawAttendees = useMemo(() => event.attendee ?? [], [event.attendee])

  const resources = useMemo(
    () =>
      rawAttendees.filter(
        attendee =>
          isResourceAttendee(attendee) &&
          isEventOfResource(attendee, calendarName, isResourceEventPreview)
      ),
    [calendarName, rawAttendees, isResourceEventPreview]
  )

  const eventAttendees = useMemo(
    () => rawAttendees.filter(attendee => !isResourceAttendee(attendee)),
    [rawAttendees]
  )

  const attendees = useMemo(
    () =>
      eventAttendees.filter(
        a => a.cal_address !== event.organizer?.cal_address
      ) || [],
    [eventAttendees, event.organizer?.cal_address]
  )

  const organizer = useMemo(
    () =>
      eventAttendees.find(
        a => a.cal_address === event.organizer?.cal_address
      ) || userAttendee.fromOrganizer(event.organizer),
    [eventAttendees, event.organizer]
  )

  return { resources, eventAttendees, attendees, organizer }
}
