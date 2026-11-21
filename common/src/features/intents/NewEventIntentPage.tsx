import { useAppSelector } from '@common/app/hooks'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { Loading } from '@common/components/Loading/Loading'
import EventPopover from '@common/features/Events/EventModal'
import { newEventWithAttendees } from '@common/features/Events/newEventDeepLinkUtils'
import type { CalendarEvent } from '@common/types/EventsTypes'
import type { CalendarApi } from '@fullcalendar/react'
import { clearEventFormTempData } from '@common/utils/eventFormTempStorage'
import type { IntentServiceAPI } from 'cozy-interapp'
import type { JSX } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { hasWritableCalendar } from './calendarsState'
import {
  ClosableMessage,
  IntentFrame,
  useNotifyShown,
  useSettle
} from './IntentFrame'
import { createdEvent, type CreatedEvent } from './newEventIntent'

const noop = (): void => {}

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
  service: IntentServiceAPI
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
 * `CREATE io.cozy.calendar.events`, drawn in the page (IntentFrame): the app
 * that asked for it (Twake Chat) draws the dialog around, sized by the page. Saved, the client gets the event (CreatedEvent);
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
  const { t } = useI18n()
  const settle = useSettle<CreatedEvent>(service)
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
  if (!hasCalendar) {
    return (
      <IntentFrame service={service}>
        <ClosableMessage
          text={t('error.calendarsNotFound')}
          onClose={() => settle(null)}
        />
      </IntentFrame>
    )
  }

  return (
    <IntentFrame service={service}>
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
      {/* The error of a failed save, as the calendar shows it (CalendarLayout) */}
      <ErrorSnackbar error={error} type="calendar" />
    </IntentFrame>
  )
}
