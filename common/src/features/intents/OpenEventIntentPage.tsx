import { useAppSelector } from '@common/app/hooks'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { EventPreviewDetails } from '@common/components/EventPreview/EventPreviewDetails'
import { EventPreviewTitleRow } from '@common/components/EventPreview/EventPreviewTitleRow'
import { getOrganizingTeamName } from '@common/components/EventPreview/teamOrganizer'
import { useEventPreviewState } from '@common/components/EventPreview/useEventPreviewState'
import { Loading } from '@common/components/Loading/Loading'
import { AttendanceValidation } from '@common/features/Events/AttendanceValidation/AttendanceValidation'
import { translateErrorMessage } from '@common/utils/translateErrorMessage'
import { Alert, Box, IconButton, Stack } from '@linagora/twake-mui'
import CloseIcon from '@mui/icons-material/Close'
import type { IntentServiceAPI } from 'cozy-interapp'
import type { ComponentProps, JSX } from 'react'
import { useState } from 'react'
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
  replyOf,
  type EventLookup,
  type ExpectedEvent,
  type OpenedEvent,
  type Reply
} from './openEventIntent'
import { useEventLookup, useFoundEvent } from './useEventLookup'
import {
  useAskedReply,
  useCloseOnceAnswered,
  useReplyToOccurrence,
  type ReplyToOccurrence
} from './useOpenEventReplies'

const noop = (): void => {}

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
  replyToOccurrence,
  isReplyNotSent,
  onClose
}: {
  calId: string
  eventId: string
  /** A reply was asked but not sent: the event is not the one the card shows */
  isReplyNotSent: boolean
  replyToOccurrence: ReplyToOccurrence
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
  const { close, setIsSending, replyToFollowedOccurrence } =
    useCloseOnceAnswered(replyOf(row), onClose, replyToOccurrence)
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
          setAfterChoiceFunc={replyToFollowedOccurrence}
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

// The event found is the one the card shows: a reply asked may go at once
function isExpectedLookup(lookup: EventLookup): boolean {
  return lookup.status === 'found' && lookup.isExpected
}

// The page shows what it found: the message of a missing event, or the
// event once the reply asked is answered
function isLookupShown(lookup: EventLookup, isReplying: boolean): boolean {
  if (lookup.status === 'missing') return true
  return lookup.status === 'found' && !isReplying
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
  const replyToOccurrence = useReplyToOccurrence(uid)
  // The uid comes from a message anyone writes: the reply goes at once only
  // when the event found is the one the card shows, else the user clicks it
  const isExpected = isExpectedLookup(lookup)
  const { isReplying, hasChanged } = useAskedReply(
    { event, calendar, reply: isExpected ? askedReply : null, expected },
    replyToOccurrence
  )
  const settle = useSettle<OpenedEvent>(service)
  useNotifyShown(service, isLookupShown(lookup, isReplying))

  switch (lookup.status) {
    case 'failed':
      return (
        <RejectedIntent
          service={service}
          message="failed"
          error="Twake Calendar could not load the event"
        />
      )
    case 'missing':
      return (
        <IntentFrame service={service}>
          <ClosableMessage
            text={translateErrorMessage(lookup.message, t)}
            onClose={() => settle(null)}
          />
        </IntentFrame>
      )
    case 'loading':
      return <Loading />
  }
  if (isReplying) return <Loading />
  return (
    <IntentFrame service={service}>
      <EventPreviewInPage
        calId={lookup.calId}
        eventId={lookup.eventId}
        replyToOccurrence={replyToOccurrence}
        isReplyNotSent={isReplyNotSent(askedReply, isExpected && !hasChanged)}
        onClose={reply => settle({ partstat: reply })}
      />
    </IntentFrame>
  )
}
