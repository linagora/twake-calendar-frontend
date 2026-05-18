import { AppDispatch } from '@/app/store'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import {
  deleteEventAsync,
  deleteEventInstanceAsync,
  putEventAsync,
  updateEventInstanceAsync
} from '@/features/Calendars/services'
import { fetchAllRecurrentVevents, putEvent } from '@/features/Events/EventDao'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { updateSeriesPartstatJCal } from '@/features/Events/transformers/updateSeriesPartstatJCal'
import { PartStat, userAttendee } from '@/features/User/models/attendee'
import { createAttendee } from '@/features/User/models/attendee.mapper'
import { userData, userOrganiser } from '@/features/User/userDataTypes'
import { buildFamilyName } from '@/utils/buildFamilyName'
import { isEventOrganiser } from '@/utils/isEventOrganiser'

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
  await dispatch(updateEventInstanceAsync({ cal: calendar, event }))
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
    await dispatch(deleteEventInstanceAsync({ cal: calendar, event }))
  } else {
    await dispatch(
      deleteEventAsync({
        calId,
        eventId,
        eventURL: event.URL
      })
    )
  }
}
