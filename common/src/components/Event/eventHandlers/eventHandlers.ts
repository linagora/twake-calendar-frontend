import { AppDispatch } from '@common/app/store'
import {
  deleteEventInstance,
  deleteEvent,
  putEvent as putEventAsync,
  updateEventInstance
} from '@common/features/Calendars/CalendarSlice'
import {
  fetchAllRecurrentVevents,
  fetchEventJCal,
  putEvent
} from '@common/features/Events/EventDao'
import {
  updateEventPartstatJCal,
  updateSeriesPartstatJCal,
  type AttendeeMatcher
} from '@common/features/Events/transformers'
import { PartStat, userAttendee } from '@common/features/User/models/attendee'
import { createAttendee } from '@common/features/User/models/attendee.mapper'
import { userData, userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { buildFamilyName } from '@common/utils/buildFamilyName'
import { isEventOrganiser } from '@common/utils/isEventOrganiser'

interface RSVPHandlerParams {
  dispatch: AppDispatch
  calendar: Calendar
  event: CalendarEvent
  user: userData | undefined
  rsvp: PartStat
  typeOfAction?: string
}

function updateEventAttendees(
  calendar: Calendar,
  event: CalendarEvent,
  user: userData | undefined,
  rsvp: PartStat
): { attendee: userAttendee[]; organizer?: userOrganiser } {
  if (calendar.owner?.resource) {
    const updatedAttendees =
      event.attendee?.map(attendeeData =>
        attendeeData.cutype === 'RESOURCE' && attendeeData.cn === calendar.name
          ? { ...attendeeData, partstat: rsvp }
          : attendeeData
      ) || []

    return { attendee: updatedAttendees }
  }

  if (!user) {
    throw new Error('Cannot update attendees without user data')
  }

  const eventHasNoAttendees = !event?.attendee || event.attendee.length === 0
  const isOrganizer = isEventOrganiser(event, user.email)
  if (eventHasNoAttendees) {
    const userdata = createAttendee({
      cal_address: user.email,
      cn: buildFamilyName(user.given_name, user.family_name, user.email),
      role: isOrganizer ? 'CHAIR' : 'REQ-PARTICIPANT',
      partstat: rsvp
    })
    return {
      organizer: isOrganizer ? userdata : event.organizer,
      attendee: [userdata]
    }
  }

  return {
    attendee: ((): userAttendee[] => {
      const userEmailLower = user.email?.toLowerCase()
      const userExists = event.attendee.some(
        attendee => attendee.cal_address?.toLowerCase() === userEmailLower
      )

      const updatedAttendees = event.attendee.map(attendeeData =>
        attendeeData.cal_address?.toLowerCase() === userEmailLower
          ? { ...attendeeData, partstat: rsvp }
          : attendeeData
      )

      if (!userExists) {
        const newUserAttendee = createAttendee({
          cal_address: user.email,
          cn: buildFamilyName(user.given_name, user.family_name, user.email),
          role: 'REQ-PARTICIPANT',
          partstat: rsvp
        })
        return [...updatedAttendees, newUserAttendee]
      }

      return updatedAttendees
    })()
  }
}

async function handleSoloRSVP(
  dispatch: AppDispatch,
  calendar: Calendar,
  event: CalendarEvent
): Promise<void> {
  await dispatch(updateEventInstance({ cal: calendar, event }))
}

async function handleAllRSVP(
  event: CalendarEvent,
  userEmail: string,
  rsvp: PartStat
): Promise<void> {
  const vevents = await fetchAllRecurrentVevents(event)
  const jCal = updateSeriesPartstatJCal(vevents, event, userEmail, rsvp)
  await putEvent(event, jCal)
}

function makePartstatMatcher(
  calendar: Calendar,
  user: userData | undefined
): AttendeeMatcher | undefined {
  if (calendar.owner?.resource) {
    return (params, _calAddress) =>
      params.cutype === 'RESOURCE' && params.cn === calendar.name
  }
  const userEmail = user?.email?.toLowerCase()
  if (!userEmail) {
    return undefined
  }
  return (_params, calAddress) => calAddress.toLowerCase() === userEmail
}

async function handleDefaultRSVP({
  dispatch,
  calendar,
  event,
  user,
  rsvp,
  fallbackEvent
}: Omit<RSVPHandlerParams, 'typeOfAction'> & {
  fallbackEvent: CalendarEvent
}): Promise<void> {
  // Update the attendee PARTSTAT directly in the stored jCal so that DTSTART,
  // VTIMEZONE and every other property are preserved exactly. Regenerating the
  // event from the parsed model drops the timezone when it is missing (#1031).
  const matcher = makePartstatMatcher(calendar, user)
  if (matcher) {
    const jCal = await fetchEventJCal(event)
    const patched = updateEventPartstatJCal(jCal, matcher, rsvp)
    if (patched) {
      const response = await putEvent(event, patched)
      if (!response.ok) {
        console.error(
          `RSVP update failed for ${event.URL} with status ${response.status}`
        )
      }
      return
    }
  }

  // No matching attendee in the event (e.g. adding oneself for the first time):
  // fall back to regenerating the event from the model.
  await dispatch(putEventAsync({ cal: calendar, newEvent: fallbackEvent }))
}

export async function handleRSVP({
  dispatch,
  calendar,
  event,
  user,
  rsvp,
  typeOfAction
}: RSVPHandlerParams): Promise<void> {
  const newEvent = {
    ...event,
    ...updateEventAttendees(calendar, event, user, rsvp)
  }

  if (typeOfAction === 'solo') {
    await handleSoloRSVP(dispatch, calendar, newEvent)
  } else if (typeOfAction === 'all') {
    if (!user?.email) {
      throw new Error('Cannot update all occurrences without user email')
    }
    await handleAllRSVP(event, user.email, rsvp)
  } else {
    await handleDefaultRSVP({
      dispatch,
      calendar,
      event,
      user,
      rsvp,
      fallbackEvent: newEvent
    })
  }
}

export async function handleDelete(
  isRecurring: boolean,
  typeOfAction: 'solo' | 'all' | undefined,
  onClose: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void,
  dispatch: AppDispatch,
  calendar: Calendar,
  event: CalendarEvent,
  calId: string,
  eventId: string
): Promise<void> {
  onClose({}, 'backdropClick')

  if (isRecurring && typeOfAction === 'solo') {
    await dispatch(deleteEventInstance({ cal: calendar, event }))
  } else {
    await dispatch(
      deleteEvent({
        calId,
        eventId,
        eventURL: event.URL
      })
    )
  }
}
