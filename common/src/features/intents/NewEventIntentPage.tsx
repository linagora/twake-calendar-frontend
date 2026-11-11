import { useAppSelector } from '@common/app/hooks'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { Loading } from '@common/components/Loading/Loading'
import EventPopover from '@common/features/Events/EventModal'
import { newEventWithAttendees } from '@common/features/Events/newEventDeepLinkUtils'
import type { CalendarEvent } from '@common/types/EventsTypes'
import type { CalendarApi } from '@fullcalendar/core'
import { clearEventFormTempData } from '@common/utils/eventFormTempStorage'
import { Button, Stack, Typography } from '@linagora/twake-mui'
import { Portal } from '@mui/material'
import type { IntentService } from 'cozy-interapp'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { useI18n } from 'twake-i18n'
import { createdEvent, type CreatedEvent } from './newEventIntent'

const noop = (): void => {}

// Without a calendar the form cannot save: say so, and let the user close it
function NoCalendar({ onClose }: { onClose: () => void }): JSX.Element {
  const { t } = useI18n()
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', p: 3 }}>
      <Typography>{t('error.calendarsNotFound')}</Typography>
      <Button variant="contained" onClick={onClose}>
        {t('actions.close')}
      </Button>
    </Stack>
  )
}

/**
 * Answers the client once: the event, or null (cancelled). cozy-interapp
 * throws on a second answer; the ref drops it.
 */
function useSettle(
  service: IntentService
): (result: CreatedEvent | null) => void {
  const settledRef = useRef(false)
  return useCallback(
    result => {
      if (settledRef.current) return
      settledRef.current = true
      if (result === null) service.cancel()
      else service.terminate(result)
    },
    [service]
  )
}

/**
 * Once something is shown, tells the client the service is ready to use and
 * hides its close button: the form and the message without a calendar have
 * their own. In an Effect, as it talks to the page around; the ref keeps it
 * to once, under StrictMode too (cozy-interapp throws on a second call).
 */
function useNotifyShown(service: IntentService, isShown: boolean): void {
  const notifiedRef = useRef(false)
  useEffect(() => {
    if (!isShown || notifiedRef.current) return
    notifiedRef.current = true
    service.notifyReadyToUse()
    service.hideCross()
  }, [service, isShown])
}

export interface NewEventIntentPageProps {
  service: IntentService
  /** Read once, when the form opens */
  initialAttendees: string[]
}

/**
 * The form of a new event alone in the frame of the intent
 * `CREATE io.cozy.calendar.events`: the app that asked for it (Twake Chat)
 * draws the dialog around. Saved, the client gets the event (CreatedEvent);
 * closed or cancelled, null. A failed save shows the calendar's error
 * snackbar over the form and tells the client nothing; without a calendar to
 * save into, a message the user closes. Used by IntentPage.
 */
export function NewEventIntentPage({
  service,
  initialAttendees
}: NewEventIntentPageProps): JSX.Element {
  const calendarRef = useRef<CalendarApi | null>(null)
  // Not `pending`, which every save sets too: the form would leave the page
  // while saving, and what the user typed with it
  const hasCalendar = useAppSelector(
    state => Object.keys(state.calendars.list).length > 0
  )
  const loading = useAppSelector(state => state.calendars.pending)
  const error = useAppSelector(state => state.calendars.error)
  // The attendees of this intent, read once: the form keeps its own state
  const [event] = useState(() => newEventWithAttendees(initialAttendees))
  const settle = useSettle(service)
  const isShown = hasCalendar || !loading
  useNotifyShown(service, isShown)

  // Each intent is a new event, for its attendees: never the draft a failed
  // save of an earlier one left. A layout effect, as the form seeds itself
  // from that draft in its own (passive) effect, which runs after it.
  useLayoutEffect(() => clearEventFormTempData('create'), [])

  // Closed to save, the form stays until the server answers: a failure
  // leaves it with what the user typed, a success answers with the event
  const closeForm = (toSave?: boolean): void => {
    if (!toSave) settle(null)
  }
  const tellCreated = (saved: CalendarEvent): void => {
    settle(createdEvent(saved))
  }

  // The form needs a calendar to save into: none once they are loaded (or
  // failed to load) is said, never while they load
  if (!isShown) return <Loading />
  if (!hasCalendar) return <NoCalendar onClose={() => settle(null)} />

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
