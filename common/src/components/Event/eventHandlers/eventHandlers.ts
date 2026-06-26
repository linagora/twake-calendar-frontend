import { AppDispatch } from '@common/app/store'
import {
  deleteEventInstance,
  deleteEvent,
  putEvent as putEventAsync,
  updateEventInstance,
  updateEventLocal,
  refreshCalendarWithSyncToken
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
import { userData, userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { buildFamilyName } from '@common/utils/buildFamilyName'
import { isEventOrganiser } from '@common/utils/isEventOrganiser'
import { getDisplayedCalendarRange } from '@common/utils'

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
          ? attendeeData.withPartStat(rsvp)
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
    const userdata = new userAttendee({
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
          ? attendeeData.withPartStat(rsvp)
          : attendeeData
      )

      if (!userExists) {
        const newUserAttendee = new userAttendee({
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

/**
 * Fetches the stored jCal, patches only the attendee PARTSTAT (preserving
 * DTSTART, VTIMEZONE and every other property byte-for-byte), then writes it
 * back. Pass `recurrenceId` to restrict the patch to a single exception VEVENT.
 *
 * Returns `true` when the patch was applied, `false` when no matching attendee
 * was found so the caller can fall back to the regeneration path.
 */
async function patchPartstatInJCal(
  event: CalendarEvent,
  matcher: AttendeeMatcher,
  partstat: PartStat,
  recurrenceId?: string
): Promise<boolean> {
  const jCal = await fetchEventJCal(event)
  const patched = updateEventPartstatJCal(
    jCal,
    matcher,
    partstat,
    recurrenceId,
    event.timezone
  )
  if (!patched) {
    return false
  }
  const response = await putEvent(event, patched)
  if (!response.ok) {
    throw new Error(
      `RSVP update failed for ${event.URL} with status ${response.status}`
    )
  }
  return true
}

async function handleSoloRSVP({
  dispatch,
  calendar,
  event,
  user,
  rsvp,
  fallbackEvent
}: Omit<RSVPHandlerParams, 'typeOfAction'> & {
  fallbackEvent: CalendarEvent
}): Promise<void> {
  const matcher = makePartstatMatcher(calendar, user)
  if (matcher && event.recurrenceId) {
    if (await patchPartstatInJCal(event, matcher, rsvp, event.recurrenceId)) {
      dispatch(updateEventLocal({ calId: calendar.id, event: fallbackEvent }))
      void dispatch(
        refreshCalendarWithSyncToken({
          calendar,
          calendarRange: getDisplayedCalendarRange()
        })
      )
      return
    }
  }
  await dispatch(updateEventInstance({ cal: calendar, event: fallbackEvent }))
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
  const matcher = makePartstatMatcher(calendar, user)
  if (matcher && (await patchPartstatInJCal(event, matcher, rsvp))) {
    dispatch(updateEventLocal({ calId: calendar.id, event: fallbackEvent }))
    void dispatch(
      refreshCalendarWithSyncToken({
        calendar,
        calendarRange: getDisplayedCalendarRange()
      })
    )
    return
  }
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
    await handleSoloRSVP({
      dispatch,
      calendar,
      event,
      user,
      rsvp,
      fallbackEvent: newEvent
    })
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
