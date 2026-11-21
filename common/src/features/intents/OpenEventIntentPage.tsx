import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { EventPreviewDetails } from '@common/components/EventPreview/EventPreviewDetails'
import { EventPreviewTitleRow } from '@common/components/EventPreview/EventPreviewTitleRow'
import { getOrganizingTeamName } from '@common/components/EventPreview/teamOrganizer'
import { useEventPreviewState } from '@common/components/EventPreview/useEventPreviewState'
import { Loading } from '@common/components/Loading/Loading'
import { getEventByUid } from '@common/features/Calendars/CalendarSlice'
import type { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { AttendanceValidation } from '@common/features/Events/AttendanceValidation/AttendanceValidation'
import { handleRSVPClick } from '@common/features/Events/AttendanceValidation/handleRSVPClick'
import { createEventContext } from '@common/features/Events/createEventContext'
import type { Calendar } from '@common/types/CalendarTypes'
import type { CalendarEvent } from '@common/types/EventsTypes'
import { translateErrorMessage } from '@common/utils/translateErrorMessage'
import { Alert, Box, IconButton, Stack } from '@linagora/twake-mui'
import CloseIcon from '@mui/icons-material/Close'
import type { IntentServiceAPI } from 'cozy-interapp'
import type { ComponentProps, JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import {
  ClosableMessage,
  IntentFrame,
  RejectedIntent,
  useNotifyShown,
  useSettle
} from './IntentFrame'
import {
  attendeeRowOf,
  failedLookup,
  foundLookup,
  replyOf,
  replyToSend,
  type EventLookup,
  type ExpectedEvent,
  type OpenedEvent,
  type Reply
} from './openEventIntent'

const noop = (): void => {}

/** The longest a close waits for a reply in flight */
const CLOSE_WAIT_MS = 10_000

/**
 * handleRSVPClick asks « this occurrence or all of them? » of an occurrence
 * (an event whose UID holds its RECURRENCE-ID: the user is invited to that
 * occurrence alone) by handing what to do once answered to a state setter,
 * as an updater. The frame asks no question: the reply goes to the whole
 * series, then the event is loaded again, as that path writes nothing to
 * the store. A whole series the user is invited to never asks: its master
 * event is replied to as one.
 *
 * @returns the setter, whose promise ends once the event is loaded again
 */
function useReplyToWholeSeries(
  uid: string
): (updater: unknown) => Promise<void> {
  const dispatch = useAppDispatch()
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  return useCallback(
    async (updater: unknown): Promise<void> => {
      const afterChoice = (updater as () => (type: 'all') => Promise<void>)()
      await afterChoice('all')
      await dispatch(getEventByUid({ userId, uid }))
    },
    [dispatch, userId, uid]
  )
}

/**
 * Looks the event up by its UID in the calendars of the user, once, with
 * the thunk of the `/events/:uid` link (getEventByUid, which puts it in the
 * store). In an Effect, as it talks to the calendar server; the ref keeps it
 * to once under StrictMode.
 */
function useEventLookup(
  uid: string,
  expected: ExpectedEvent | null
): EventLookup {
  const dispatch = useAppDispatch()
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const email = useAppSelector(state => state.user.userData.email)
  const [lookup, setLookup] = useState<EventLookup>({ status: 'loading' })
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    dispatch(getEventByUid({ userId, uid }))
      .unwrap()
      .then(found => setLookup(foundLookup(found, uid, email, expected)))
      // unwrap rejects with the rejected value of the thunk
      .catch((error: unknown) =>
        setLookup(failedLookup(error as RejectedError | undefined))
      )
  }, [dispatch, userId, email, uid])
  return lookup
}

/**
 * The event the lookup found and its calendar, read live from the store:
 * a reply sent updates them
 */
function useFoundEvent(
  lookup: EventLookup
): [CalendarEvent | undefined, Calendar | undefined] {
  const calendar = useAppSelector(state =>
    lookup.status === 'found' ? state.calendars.list[lookup.calId] : undefined
  )
  const event =
    lookup.status === 'found' ? calendar?.events[lookup.eventId] : undefined
  return [event, calendar]
}

/**
 * Sends the reply the client asked for, once the event is found, through
 * the path of the reply buttons (handleRSVPClick), before the preview shows:
 * nothing can close the frame while it is in flight. A refused reply shows
 * the calendar's error over the preview.
 *
 * @returns whether that reply is still in flight
 */
function useAskedReply(
  event: CalendarEvent | undefined,
  calendar: Calendar | undefined,
  asked: Reply | null,
  replyToWholeSeries: (updater: unknown) => Promise<void>
): boolean {
  const dispatch = useAppDispatch()
  const user = useAppSelector(state => state.user.userData)
  const reply = event ? replyToSend(event, user.email, asked) : null
  const [isAnswered, setIsAnswered] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!event || !calendar || reply === null || startedRef.current) return
    startedRef.current = true
    // handleRSVPClick hands an occurrence over to the setter and returns:
    // the reply is answered once that follow-up is done too
    let wholeSeries: Promise<void> = Promise.resolve()
    const send = async (): Promise<void> => {
      await handleRSVPClick(
        reply,
        createEventContext(event, calendar, user),
        user,
        updater => {
          wholeSeries = replyToWholeSeries(updater)
        },
        noop,
        dispatch
      )
      await wholeSeries
    }
    void send().finally(() => setIsAnswered(true))
  }, [event, calendar, user, reply, dispatch, replyToWholeSeries])

  return reply !== null && !isAnswered
}

/**
 * The close of the preview, held while a reply the user clicked is in
 * flight (sent by the buttons, then, for an occurrence, its reload): the
 * client removes the frame once it has its answer, which would abort that
 * reply and give it the former one. The Effect closes once nothing is in
 * flight (or after 10 s: the former one then), with the reply then in the store: the new one once the server
 * confirmed it, the former one when it refused it.
 *
 * @returns what the close button calls, what AttendanceValidation tells of
 *   its replies, and the reply to a whole series, followed
 */
function useCloseOnceAnswered(
  reply: Reply | null,
  onClose: (reply: Reply | null) => void,
  replyToWholeSeries: (updater: unknown) => Promise<void>
): {
  close: () => void
  setIsSending: (isSending: boolean) => void
  replyToFollowedSeries: (updater: unknown) => void
} {
  const [isClosing, setIsClosing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  // The client has no close button of its own here: a server that never
  // answers must not keep the user in the frame
  const [isLate, setIsLate] = useState(false)
  useEffect(() => {
    if (!isClosing) return
    const timer = setTimeout(() => setIsLate(true), CLOSE_WAIT_MS)
    return () => clearTimeout(timer)
  }, [isClosing])
  useEffect(() => {
    if (isClosing && (isLate || (!isSending && !isReloading))) onClose(reply)
  }, [isClosing, isLate, isSending, isReloading, reply, onClose])
  return {
    close: () => setIsClosing(true),
    setIsSending,
    replyToFollowedSeries: (updater): void => {
      setIsReloading(true)
      void replyToWholeSeries(updater).finally(() => setIsReloading(false))
    }
  }
}

/**
 * The reply buttons of the preview (AttendanceValidation), with, above them,
 * the notice that the reply asked was not sent. The notice goes once the
 * user clicks a reply: the answer is theirs then.
 */
function ReplySection({
  contextualizedEvent,
  user,
  isReplyNotSent,
  setAfterChoiceFunc,
  onReplyingChange
}: {
  contextualizedEvent: ComponentProps<
    typeof AttendanceValidation
  >['contextualizedEvent']
  user: ComponentProps<typeof AttendanceValidation>['user']
  isReplyNotSent: boolean
  setAfterChoiceFunc: (updater: unknown) => void
  onReplyingChange: (isSending: boolean) => void
}): JSX.Element {
  const { t } = useI18n()
  const [hasClicked, setHasClicked] = useState(false)
  return (
    <>
      {isReplyNotSent && !hasClicked && (
        <Alert severity="info">{t('intents.replyNotSent')}</Alert>
      )}
      <AttendanceValidation
        contextualizedEvent={contextualizedEvent}
        user={user}
        setAfterChoiceFunc={setAfterChoiceFunc}
        setOpenEditModePopup={noop}
        onReplyingChange={isSending => {
          if (isSending) setHasClicked(true)
          onReplyingChange(isSending)
        }}
      />
    </>
  )
}

/**
 * Calendar's preview of the event, in the page: its title and date, its
 * details (the attendees with their replies), and, to an attendee, the
 * question whether they come. Edit, delete, duplicate and move are left to
 * the calendar. The close button gives the reply of the user (onClose),
 * once the one they clicked is answered.
 */
function EventPreviewInPage({
  calId,
  eventId,
  replyToWholeSeries,
  isReplyNotSent,
  onClose
}: {
  calId: string
  eventId: string
  /** A reply was asked but not sent: the event is not the one the card shows */
  isReplyNotSent: boolean
  replyToWholeSeries: (updater: unknown) => Promise<void>
  onClose: (reply: Reply | null) => void
}): JSX.Element | null {
  const { t } = useI18n()
  const {
    event,
    calendar,
    user,
    timezone,
    contextualizedEvent,
    isOwn,
    isOrganizer,
    isNotPrivate
  } = useEventPreviewState(eventId, calId, false, true, noop)
  const error = useAppSelector(state => state.calendars.error)
  // Their own row, never the one of the owner of a calendar shared with them
  const row = event ? attendeeRowOf(event, user.email) : undefined
  const { close, setIsSending, replyToFollowedSeries } = useCloseOnceAnswered(
    replyOf(row),
    onClose,
    replyToWholeSeries
  )
  if (!event || !calendar) return null

  const teamName = getOrganizingTeamName(calendar, event.organizer)

  return (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton
          size="small"
          aria-label={t('actions.close')}
          onClick={close}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <EventPreviewTitleRow
        event={event}
        isOwn={isOwn}
        timezone={timezone}
        t={t}
        headingComponent="h1"
      />
      <EventPreviewDetails
        event={event}
        isOwn={isOwn}
        isOrganizer={isOrganizer}
        isNotPrivate={isNotPrivate}
        isResourceEventPreview={calendar.owner?.resource}
        isTeamCalendar={Boolean(teamName)}
        teamName={teamName}
        calendarName={calendar.name}
        ownerEmail={calendar.owner?.emails?.[0]}
      />
      {row && contextualizedEvent && (
        <ReplySection
          contextualizedEvent={contextualizedEvent}
          user={user}
          isReplyNotSent={isReplyNotSent}
          setAfterChoiceFunc={replyToFollowedSeries}
          onReplyingChange={setIsSending}
        />
      )}
      {/* A reply the server refused, as the calendar shows it */}
      <ErrorSnackbar error={error} type="calendar" />
    </Stack>
  )
}

/** A reply was asked, and the event is not the one the card shows: it was not sent */
function isReplyNotSent(asked: Reply | null, isExpected: boolean): boolean {
  return asked !== null && !isExpected
}

export interface OpenEventIntentPageProps {
  service: IntentServiceAPI
  uid: string
  /** The reply to send first, read once, when the client answered */
  askedReply: Reply | null
  /** What the card shows of the event, null when it says nothing */
  expected: ExpectedEvent | null
}

/**
 * The preview of an event alone in the frame of the intent
 * `OPEN io.cozy.calendar.events`, drawn in the page (IntentFrame): the app
 * that asked for it (Twake Chat) draws the dialog around, sized by the page.
 * Looks the event up by its UID, sends the reply asked for, then shows the
 * preview; closed, the client gets the reply of the user (OpenedEvent). An
 * unknown UID says so, then cancels; a failed lookup (the server down, or
 * an event in a calendar the user does not list) fails the intent. Used
 * by IntentPage.
 */
export function OpenEventIntentPage({
  service,
  uid,
  askedReply,
  expected
}: OpenEventIntentPageProps): JSX.Element {
  const { t } = useI18n()
  const lookup = useEventLookup(uid, expected)
  const [event, calendar] = useFoundEvent(lookup)
  const replyToWholeSeries = useReplyToWholeSeries(uid)
  // The uid comes from a message anyone writes: the reply goes at once only
  // when the event found is the one the card shows, else the user clicks it
  const isExpected = lookup.status === 'found' && lookup.isExpected
  const isReplying = useAskedReply(
    event,
    calendar,
    isExpected ? askedReply : null,
    replyToWholeSeries
  )
  const settle = useSettle<OpenedEvent>(service)
  const isShown =
    lookup.status === 'missing' || (lookup.status === 'found' && !isReplying)
  useNotifyShown(service, isShown)

  if (lookup.status === 'failed') {
    return (
      <RejectedIntent
        service={service}
        message="failed"
        error="Twake Calendar could not load the event"
      />
    )
  }
  if (lookup.status === 'missing') {
    return (
      <IntentFrame service={service}>
        <ClosableMessage
          text={translateErrorMessage(lookup.message, t)}
          onClose={() => settle(null)}
        />
      </IntentFrame>
    )
  }
  if (lookup.status === 'loading' || isReplying) return <Loading />
  return (
    <IntentFrame service={service}>
      <EventPreviewInPage
        calId={lookup.calId}
        eventId={lookup.eventId}
        replyToWholeSeries={replyToWholeSeries}
        isReplyNotSent={isReplyNotSent(askedReply, isExpected)}
        onClose={reply => settle({ partstat: reply })}
      />
    </IntentFrame>
  )
}
