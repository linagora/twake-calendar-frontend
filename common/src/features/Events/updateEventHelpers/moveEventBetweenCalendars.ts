import { AppDispatch } from '@common/app/store'
import {
  deleteEvent,
  moveEvent,
  putEvent
} from '@common/features/Calendars/CalendarSlice'
import { fetchAllRecurrentVevents } from '@common/features/Events/EventDao'
import { parseCalendarEvent } from '@common/features/Events/utils'
import { buildDelegatedEventURL } from '@common/features/Events/utils/buildDelegatedEventURL'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { assertThunkSuccess } from '@common/utils/assertThunkSuccess'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { filterComponents } from '../transformers/parseFetchedEvent'

export interface MoveEventBetweenCalendarsParams {
  dispatch: AppDispatch
  calList: Record<string, Calendar>
  newEvent: CalendarEvent
  oldCalId: string
  newCalId: string
}

/**
 * If the event is a recurring instance (has a recurrenceId), fetch all
 * VEVENTs for the series and return the master — the VEVENT that has no
 * RECURRENCE-ID.  If the event is already the master (or is not recurring),
 * it is returned as-is.
 */
async function resolveMasterEvent(
  event: CalendarEvent,
  calendar: Calendar
): Promise<CalendarEvent> {
  if (!event.recurrenceId) {
    return event
  }

  const vevents = await fetchAllRecurrentVevents(event)
  const masterVevent = vevents
    .filter(([n]) => n === 'vevent')
    .find(([, props]) => !props.some(([k]) => k === 'recurrence-id'))

  if (!masterVevent) {
    throw new Error(
      `Could not find master event for recurring series: ${event.uid}`
    )
  }
  return parseCalendarEvent({
    data: masterVevent[1],
    color: event.color as Record<string, string>,
    calendar,
    eventURL: event.URL,
    valarms: filterComponents(masterVevent, 'valarm')
  })
}

function resolveOrganizerForCalendar(
  calendar: Calendar,
  originalOrganizer: CalendarEvent['organizer']
): CalendarEvent['organizer'] {
  const ownerEmail = calendar.owner?.emails?.[0]
  if (!ownerEmail) {
    return originalOrganizer
  }

  return new userOrganiser({
    cal_address: ownerEmail,
    cn: makeDisplayName(calendar) ?? originalOrganizer?.cn ?? ''
  })
}

function rewriteAttendeesForOrganizerChange(
  attendees: userAttendee[],
  oldOrganizer?: userOrganiser,
  newOrganizer?: userOrganiser
): userAttendee[] {
  if (!newOrganizer) {
    return attendees
  }
  const normalise = (addr: string | undefined): string =>
    (addr ?? '').toLowerCase()
  const oldAddr = normalise(oldOrganizer?.cal_address)
  const newAddr = normalise(newOrganizer.cal_address)

  // Remove the old organizer from the attendee list if there is one
  const filtered = attendees.filter(a => normalise(a.cal_address) !== oldAddr)

  // Add the new organizer as CHAIR if they are not already listed
  const alreadyPresent = filtered.some(
    a => normalise(a.cal_address) === newAddr
  )

  if (!alreadyPresent && newAddr) {
    filtered.push(userAttendee.fromOrganizer(newOrganizer))
  }

  return filtered
}

export async function moveEventBetweenCalendars({
  dispatch,
  calList,
  newEvent,
  oldCalId,
  newCalId
}: MoveEventBetweenCalendarsParams): Promise<void> {
  const oldCalendar = calList[oldCalId]
  if (!oldCalendar) {
    throw new Error(`Old calendar not found: ${oldCalId}`)
  }

  const targetCalendar = calList[newCalId]
  if (!targetCalendar) {
    throw new Error(`Target calendar not found: ${newCalId}`)
  }

  // Always operate on the master event — never on a recurring instance
  const masterEvent = await resolveMasterEvent(newEvent, oldCalendar)

  const isDelegatedMove = oldCalendar.delegated || targetCalendar.delegated

  if (isDelegatedMove) {
    await moveDelegatedEvent({
      dispatch,
      newEvent: masterEvent,
      oldCalendar,
      targetCalendar
    })
  } else {
    await moveStandardEvent({
      dispatch,
      newEvent: masterEvent,
      targetCalendar,
      oldCalendar
    })
  }
}

interface StandardMoveParams {
  dispatch: AppDispatch
  newEvent: CalendarEvent
  targetCalendar: Calendar
  oldCalendar: Calendar
}

async function moveStandardEvent({
  dispatch,
  newEvent,
  targetCalendar,
  oldCalendar
}: StandardMoveParams): Promise<void> {
  const newCalId = targetCalendar.id

  const putResult = await dispatch(
    putEvent({
      cal: oldCalendar,
      newEvent: { ...newEvent, calId: oldCalendar.id }
    })
  )
  await assertThunkSuccess(putResult)
  const newURL = `/calendars/${newCalId}/${extractEventBaseUuid(newEvent.uid)}.ics`

  const moveResult = await dispatch(
    moveEvent({
      cal: targetCalendar,
      newEvent,
      newURL
    })
  )
  await assertThunkSuccess(moveResult)
}

interface DelegatedMoveParams {
  dispatch: AppDispatch
  newEvent: CalendarEvent
  oldCalendar: Calendar
  targetCalendar: Calendar
}

async function moveDelegatedEvent({
  dispatch,
  newEvent,
  oldCalendar,
  targetCalendar
}: DelegatedMoveParams): Promise<void> {
  const newCalId = targetCalendar.id

  const newOrganizer = resolveOrganizerForCalendar(
    targetCalendar,
    newEvent.organizer
  )

  const newAttendees = rewriteAttendeesForOrganizerChange(
    newEvent.attendee ?? [],
    newEvent.organizer,
    newOrganizer
  )

  const newURL = `/calendars/${newCalId}/${extractEventBaseUuid(newEvent.uid)}.ics`
  const eventForTargetCalendar: CalendarEvent = {
    ...newEvent,
    calId: newCalId,
    URL: targetCalendar.delegated
      ? buildDelegatedEventURL(targetCalendar, newURL)
      : newURL,
    organizer: newOrganizer,
    attendee: newAttendees
  }

  const putResult = await dispatch(
    putEvent({ cal: targetCalendar, newEvent: eventForTargetCalendar })
  )

  await assertThunkSuccess(putResult)

  const deleteResult = await dispatch(
    deleteEvent({
      calId: oldCalendar.id,
      eventId: newEvent.uid,
      eventURL: newEvent.URL
    })
  )

  await assertThunkSuccess(deleteResult)
}
