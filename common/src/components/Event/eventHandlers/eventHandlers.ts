import { AppDispatch } from '@common/app/store'
import {
  deleteEventInstance,
  deleteEvent,
  putEvent as putEventAsync,
  updateEventInstance
} from '@common/features/Calendars/CalendarSlice'
import {
  fetchAllRecurrentVevents,
  putEvent
} from '@common/features/Events/EventDao'
import { updateSeriesPartstatJCal } from '@common/features/Events/transformers'
import { PartStat, userAttendee } from '@common/features/User/models/attendee'
import { createAttendee } from '@common/features/User/models/attendee.mapper'
import { userData, userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { buildFamilyName } from '@common/utils/buildFamilyName'
import { isEventOrganiser } from '@common/utils/isEventOrganiser'

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

async function handleDefaultRSVP(
  dispatch: AppDispatch,
  calendar: Calendar,
  newEvent: CalendarEvent
): Promise<void> {
  await dispatch(putEventAsync({ cal: calendar, newEvent }))
}

export async function handleRSVP(
  dispatch: AppDispatch,
  calendar: Calendar,
  user: userData | undefined,
  event: CalendarEvent,
  rsvp: PartStat,
  typeOfAction?: string
): Promise<void> {
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
    await handleDefaultRSVP(dispatch, calendar, newEvent)
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
