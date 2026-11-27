import { userAttendee } from '@common/features/User/models/attendee'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  isOfAnotherDomain,
  normalizeIdentity
} from '@common/utils/normalizeIdentity'
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
  organizerSentBy: string | undefined
  organizerSentByExternal: boolean
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

  // A delegate scheduling for themselves tells the user nothing, so only a
  // sender distinct from the organizer is worth disclosing.
  const organizerSentBy = useMemo(() => {
    const eventOrganizer = event.organizer
    if (!eventOrganizer?.sentBy) return undefined

    const sentByOrganizerThemselves =
      normalizeIdentity(eventOrganizer.sentBy) ===
      normalizeIdentity(eventOrganizer.cal_address)

    return sentByOrganizerThemselves ? undefined : eventOrganizer.sentBy
  }, [event.organizer])

  // An assistant shares the domain of the organizer; a sender of another
  // domain is what an invitation forwarded by a third party looks like.
  const organizerSentByExternal = Boolean(
    organizerSentBy &&
    isOfAnotherDomain(organizerSentBy, event.organizer?.cal_address)
  )

  return {
    resources,
    eventAttendees,
    attendees,
    organizer,
    organizerSentBy,
    organizerSentByExternal
  }
}
