import { useAppSelector } from '@common/app/hooks'
import EventPopover from '@common/features/Events/EventModal'
import {
  newEventWithAttendees,
  parseNewEventAttendees
} from '@common/features/Events/newEventDeepLinkUtils'
import type { CalendarEvent } from '@common/types/EventsTypes'
import type { CalendarApi } from '@fullcalendar/core'
import { clearEventFormTempData } from '@common/utils/eventFormTempStorage'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { newEventHost } from './newEventEmbed'

const noop = (): void => {}

// Closed to save, the form stays until the server answers: a failure leaves
// it with what the user typed, a success says event-created
const closeForm = (toSave?: boolean): void => {
  if (!toSave) newEventHost?.closed()
}
const tellCreated = (event: CalendarEvent): void => {
  newEventHost?.eventCreated(event)
}

/**
 * The form of a new event, alone on the page, as Twake Chat frames it in a
 * dialog of a room (/embed/newEvent?attendee=…). It tells Chat when the event
 * is saved or the form closed (newEventEmbed.ts); Chat then closes its dialog.
 * Rendered by the router of App, once the user and the calendars are loaded.
 */
export function EmbeddedNewEvent(): JSX.Element | null {
  const search = useAppSelector(state => state.router?.location?.search ?? '')
  const calendarRef = useRef<CalendarApi | null>(null)
  const isSignedIn = useAppSelector(state => Boolean(state.user.tokens))
  // Not `pending`, which every save sets too: the form would leave the page
  // while saving, and what the user typed with it
  const hasCalendar = useAppSelector(
    state => Object.keys(state.calendars.list).length > 0
  )
  const event = useMemo(
    () =>
      newEventWithAttendees(
        parseNewEventAttendees(new URLSearchParams(search))
      ),
    [search]
  )

  // Each frame is a new event, for the attendees of its link: never the draft
  // a failed save of an earlier frame left. A layout effect, as the form seeds
  // itself from that draft in its own (passive) effect, which runs after it.
  useLayoutEffect(() => clearEventFormTempData('create'), [])

  // The form needs a calendar to save into
  if (!isSignedIn || !hasCalendar) return null

  return (
    <EventPopover
      open
      embedded
      onClose={closeForm}
      onCreated={tellCreated}
      selectedRange={null}
      setSelectedRange={noop}
      calendarRef={calendarRef}
      event={event}
      anchorEl={document.body}
    />
  )
}
