import { useAppSelector } from '@common/app/hooks'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import EventPopover from '@common/features/Events/EventModal'
import {
  newEventWithAttendees,
  parseNewEventAttendees
} from '@common/features/Events/newEventDeepLinkUtils'
import type { CalendarEvent } from '@common/types/EventsTypes'
import type { CalendarApi } from '@fullcalendar/core'
import { clearEventFormTempData } from '@common/utils/eventFormTempStorage'
import { Button, Stack, Typography } from '@linagora/twake-mui'
import { Portal } from '@mui/material'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useI18n } from 'twake-i18n'
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

// Without a calendar the form cannot save: say so, and let the user close it
function NoCalendar(): JSX.Element {
  const { t } = useI18n()
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', p: 3 }}>
      <Typography>{t('error.calendarsNotFound')}</Typography>
      <Button variant="contained" onClick={() => closeForm()}>
        {t('actions.close')}
      </Button>
    </Stack>
  )
}

/**
 * The form of a new event, alone on the page, as Twake Chat frames it in a
 * dialog of a room (/embed/newEvent?attendee=…). It tells Chat when the event
 * is saved or the form closed (newEventEmbed.ts); Chat then closes its dialog.
 * A failed save shows the calendar's error snackbar over the form; without a
 * calendar to save into, a message the user closes (Chat is told on that
 * click). Rendered by the router of App (EMBED_NEW_EVENT_ROUTE).
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
  const loading = useAppSelector(state => state.calendars.pending)
  const error = useAppSelector(state => state.calendars.error)
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

  if (!isSignedIn) return null
  // The form needs a calendar to save into: none once they are loaded (or
  // failed to load) is said, never while they load
  if (!hasCalendar) return loading ? null : <NoCalendar />

  return (
    <>
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
      {/* The error of a failed save, as the calendar shows it (CalendarLayout).
          In a portal: the open form hides the rest of the page from assistive
          technologies, not what is added to the page after it opened */}
      <Portal>
        <ErrorSnackbar error={error} type="calendar" />
      </Portal>
    </>
  )
}
