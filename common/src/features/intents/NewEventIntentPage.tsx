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
import { hasWritableCalendar } from './calendarsState'
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

interface SaveInFlight {
  isSaving: boolean
  onSavingChange: (isSaving: boolean) => void
  settle: (result: CreatedEvent | null) => void
}

/**
 * The close of the form, while a save may be in flight: the server may still
 * create the event, so a Close confirmed then waits for the outcome. Saved,
 * the client gets the event (onCreated, as always); failed, null. A save that
 * fails with no Close pending gives the form back to the user. Whether a
 * save is in flight comes from the form's submit alone (`onFormSavingChange`,
 * useSubmitOnce).
 */
function useCloseForm({ isSaving, onSavingChange, settle }: SaveInFlight): {
  isClosing: boolean
  closeForm: (toSave?: boolean) => void
  onFormSavingChange: (isSaving: boolean) => void
} {
  const [isClosing, setIsClosing] = useState(false)
  // Read by the save in flight, which calls back the function of the render
  // it started from: the state of that render would be stale
  const isClosingRef = useRef(false)

  const closeForm = (toSave?: boolean): void => {
    // The form closes to save before the server answers (createAction.ts):
    // it stays until then, its submit tells the save
    if (toSave) return
    if (!isSaving) {
      settle(null)
      return
    }
    isClosingRef.current = true
    setIsClosing(true)
  }
  const onFormSavingChange = useCallback(
    (saving: boolean): void => {
      if (!saving && isClosingRef.current) settle(null)
      else onSavingChange(saving)
    },
    [settle, onSavingChange]
  )
  return { isClosing, closeForm, onFormSavingChange }
}

export interface NewEventIntentPageProps {
  service: IntentService
  /** Read once, when the form opens */
  initialAttendees: string[]
  /** The session ended (IntentPage): a save in flight is waited for */
  hasSessionEnded: boolean
  /**
   * A save sent and not failed (a saved one stays so), held by IntentPage,
   * which waits for its outcome too
   */
  isSaving: boolean
  onSavingChange: (isSaving: boolean) => void
}

/**
 * The form of a new event alone in the frame of the intent
 * `CREATE io.cozy.calendar.events`: the app that asked for it (Twake Chat)
 * draws the dialog around. Saved, the client gets the event (CreatedEvent);
 * closed or cancelled, null. A failed save shows the calendar's error
 * snackbar over the form and tells the client nothing; without a calendar to
 * save into, a message the user closes. Closed, or the session ended, while a
 * save is in flight: a loader until the server answers, whose answer decides
 * (useCloseForm, IntentPage). Used by IntentPage.
 */
export function NewEventIntentPage({
  service,
  initialAttendees,
  hasSessionEnded,
  isSaving,
  onSavingChange
}: NewEventIntentPageProps): JSX.Element {
  const calendarRef = useRef<CalendarApi | null>(null)
  // Not `pending`, which every save sets too: the form would leave the page
  // while saving, and what the user typed with it
  const hasCalendar = useAppSelector(hasWritableCalendar)
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

  const { isClosing, closeForm, onFormSavingChange } = useCloseForm({
    isSaving,
    onSavingChange,
    settle
  })
  const hasEnded = isClosing || hasSessionEnded
  const tellCreated = (saved: CalendarEvent): void => {
    settle(createdEvent(saved))
  }

  // The user or the session is done: only the outcome of the save is left
  if (isSaving && hasEnded) return <Loading />
  // The form needs a calendar to save into: none once they are loaded is
  // said, never while they load (a load that failed is IntentPage's)
  if (!isShown) return <Loading />
  if (!hasCalendar) return <NoCalendar onClose={() => settle(null)} />

  return (
    <>
      <EventPopover
        open
        embedded
        onClose={closeForm}
        onCreated={tellCreated}
        onSavingChange={onFormSavingChange}
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
