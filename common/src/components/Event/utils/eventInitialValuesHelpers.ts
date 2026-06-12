import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { resolveTimezone } from '@common/utils/timezone'
import { addVideoConferenceToDescription } from '@common/utils/videoConferenceUtils'

import {
  formatEventDates,
  buildFromSelectedRange,
  buildDefaultNewEvent
} from './initialValues/dateResolvers'
import { resolveRepetition } from './initialValues/recurrenceResolvers'
import {
  resolveAttendeesAndResources,
  resolveOrganizerEmail
} from './initialValues/attendeeResolvers'
import { resolveFormCalendarId } from './initialValues/permissionResolvers'

export { buildFromSelectedRange, buildDefaultNewEvent }

function resolveDescription(event: CalendarEvent): string {
  const description = event.description ?? ''
  const meetingLink = event.x_openpass_videoconference

  if (!meetingLink || !description) {
    return description
  }

  if (description.includes('Visio:')) {
    return description
  }

  return addVideoConferenceToDescription(description, meetingLink)
}

export interface BuildFromExistingEventParams {
  event: CalendarEvent
  resolvedCalendarTimezone: string
  calList: Record<string, Calendar>
  userId: string
  defaultCalendarId: string
  organizer: userOrganiser | userAttendee | undefined
  calId?: string
}

/**
 * Builds initial values from an existing event (edit/duplicate).
 */
export function buildFromExistingEvent({
  event,
  resolvedCalendarTimezone,
  calList,
  userId,
  defaultCalendarId,
  organizer,
  calId
}: BuildFromExistingEventParams): Partial<EventFormValues> {
  const isAllDay = event.allday ?? false
  const eventTimezone = event.timezone
    ? resolveTimezone(event.timezone)
    : resolvedCalendarTimezone

  const { start, end } = formatEventDates(event, isAllDay)
  const description = resolveDescription(event)
  const { repetition, showRepeat } = resolveRepetition(event, calId, calList)
  const organizerEmail = resolveOrganizerEmail(event, organizer)

  const { attendees, selectedResources } = resolveAttendeesAndResources(
    event,
    organizerEmail
  )

  const formCalendarId = resolveFormCalendarId({
    event,
    calList,
    userId,
    defaultCalendarId,
    calId
  })

  const eventData: Partial<EventFormValues> = {
    title: event.title ?? '',
    description,
    location: event.location ?? '',
    allday: isAllDay,
    repetition,
    attendees,
    alarm: event.alarm?.trigger ?? '',
    eventClass: window.DISABLE_PUBLIC_VISIBILITY
      ? 'PRIVATE'
      : (event.class ?? 'PUBLIC'),
    busy: event.transp ?? 'OPAQUE',
    timezone: eventTimezone,
    calendarid: formCalendarId,
    hasVideoConference: !!event.x_openpass_videoconference,
    meetingLink: event.x_openpass_videoconference || null,
    selectedResources,
    attachments: event.attach ?? [],
    showDescription: !!event.description,
    showRepeat
  }

  if (start) {
    eventData.start = start
  }

  if (end) {
    eventData.end = end
  }

  return eventData
}
