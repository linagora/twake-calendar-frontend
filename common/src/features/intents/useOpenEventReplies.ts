import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import type { AppDispatch } from '@common/app/store'
import {
  getEventByUid,
  setCalendarError
} from '@common/features/Calendars/CalendarSlice'
import { extractCalendarEvents } from '@common/features/Calendars/utils/extractCalendarEvents'
import { canWriteToCalendar } from '@common/features/Calendars/utils/calendarPermissions'
import { fetchEventJCal } from '@common/features/Events/EventDao'
import type { userData } from '@common/features/User/userDataTypes'
import { handleRSVPClick } from '@common/features/Events/AttendanceValidation/handleRSVPClick'
import { createEventContext } from '@common/features/Events/createEventContext'
import type { Calendar } from '@common/types/CalendarTypes'
import type { CalendarEvent } from '@common/types/EventsTypes'
import type { UnknownAction } from '@reduxjs/toolkit'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cardCandidates,
  isExpectedEvent,
  replyToSend,
  type ExpectedEvent,
  type Reply
} from './openEventIntent'

/** What handleRSVPClick hands to its state setter for an occurrence */
export type ReplyToOccurrence = (updater: unknown) => Promise<void>

/** The longest a close waits for a reply in flight */
const CLOSE_WAIT_MS = 10_000

const noop = (): void => {}

/**
 * handleRSVPClick asks « this occurrence or all of them? » of an occurrence
 * (an event whose UID holds its RECURRENCE-ID: the lookup picks one only
 * when the master does not invite the user) by handing what to do once
 * answered to a state setter, as an updater. The frame asks no question:
 * the reply goes to that occurrence alone (its RECURRENCE-ID, with the
 * address of the user, as the lookup checked it), then the event is loaded
 * again. A series whose master invites the user never asks: its master is
 * replied to as one.
 *
 * @returns the setter, whose promise ends once the event is loaded again
 *   (loaded or not: the reply confirmed is already in the store)
 */
export function useReplyToOccurrence(uid: string): ReplyToOccurrence {
  const dispatch = useAppDispatch()
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const reloadsRef = useRef<Reloads>({ started: 0, newest: null })
  return useCallback(
    async (updater: unknown): Promise<void> => {
      const afterChoice = (updater as () => (type: 'solo') => Promise<void>)()
      await afterChoice('solo')
      const order = ++reloadsRef.current.started
      const answer = await dispatch(getEventByUid({ userId, uid }))
      keepNewestAnswer(reloadsRef.current, order, answer, dispatch)
    },
    [dispatch, userId, uid]
  )
}

/** The reloads of an occurrence, counted in the order they were asked */
interface Reloads {
  started: number
  /** The newest one answered: its order, and its answer */
  newest: { order: number; answer: UnknownAction } | null
}

// Two clicks reload the event at once, and each answer replaces the event in
// the store as it ends (getEventByUid, shared with the rest of Calendar): an
// older answer ending last would show the reply the user changed since. The
// newest answer is then put back, without asking the server again: local to
// OPEN, the thunk is left as the rest of Calendar uses it.
function keepNewestAnswer(
  reloads: Reloads,
  order: number,
  answer: UnknownAction,
  dispatch: AppDispatch
): void {
  const { newest } = reloads
  if (newest && order < newest.order) dispatch(copyOf(newest.answer))
  else reloads.newest = { order, answer }
}

// The reducer of getEventByUid writes into the events of its payload, which
// the store then freezes: the answer is put back as a copy
function copyOf(answer: UnknownAction): UnknownAction {
  return { ...answer, payload: structuredClone(answer.payload) }
}

// The reply asked, to send at once: none outside a calendar the user may
// write to (a delegation read only), nor when the user is not invited or
// already gave it
function askedReplyToSend(
  event: CalendarEvent | undefined,
  calendar: Calendar | undefined,
  user: userData,
  asked: Reply | null
): Reply | null {
  if (!event || !calendar) return null
  if (!canWriteToCalendar(calendar, user.openpaasId ?? '')) return null
  return replyToSend(event, user.email, asked)
}

// The event as the server holds it now, read again right before the write,
// is still the one the card shows: its organizer may have renamed or moved
// it since the lookup. Read as the lookup reads it (extractCalendarEvents),
// and on the same VEVENTs (cardCandidates).
async function isStillExpected(
  event: CalendarEvent,
  calendar: Calendar,
  expected: ExpectedEvent | null,
  email: string
): Promise<boolean> {
  const jCal = await fetchEventJCal(event)
  const events = extractCalendarEvents(
    {
      data: jCal,
      _links: { self: { href: event.URL } }
    },
    { cal: calendar, color: calendar.color }
  )
  return isExpectedEvent(cardCandidates(events, event, email), expected)
}

/** The reply asked with OPEN, and what the card showed of its event */
export interface AskedReply {
  event: CalendarEvent | undefined
  calendar: Calendar | undefined
  /** null when none may go at once (the event is not the one of the card) */
  reply: Reply | null
  expected: ExpectedEvent | null
}

/**
 * Sends the reply the client asked for, once the event is found, through
 * the path of the reply buttons (handleRSVPClick), before the preview shows:
 * nothing can close the frame while it is in flight. The event is read
 * again first: changed since the lookup, nothing is written. A refused
 * reply shows the calendar's error over the preview. In an Effect, as it
 * talks to the calendar server; the ref keeps it to once. Used by
 * OpenEventIntentPage.
 *
 * @returns whether that reply is still in flight, and whether it was not
 *   sent because the event changed
 */
export function useAskedReply(
  { event, calendar, reply: asked, expected }: AskedReply,
  replyToOccurrence: ReplyToOccurrence
): { isReplying: boolean; hasChanged: boolean } {
  const dispatch = useAppDispatch()
  const user = useAppSelector(state => state.user.userData)
  const reply = askedReplyToSend(event, calendar, user, asked)
  const [isAnswered, setIsAnswered] = useState(false)
  const [hasChanged, setHasChanged] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!event || !calendar || reply === null || startedRef.current) return
    startedRef.current = true
    // handleRSVPClick hands an occurrence over to the setter and returns:
    // the reply is answered once that follow-up is done too
    let followUp: Promise<void> = Promise.resolve()
    const send = async (): Promise<void> => {
      if (!(await isStillExpected(event, calendar, expected, user.email))) {
        setHasChanged(true)
        return
      }
      await handleRSVPClick(
        reply,
        createEventContext(event, calendar, user),
        user,
        updater => {
          followUp = replyToOccurrence(updater)
        },
        noop,
        dispatch
      )
      await followUp
    }
    void send()
      // The read again failed: as a reply the server refused
      .catch(() =>
        dispatch(
          setCalendarError('TRANSLATION:error.participationUpdateFailed')
        )
      )
      .finally(() => setIsAnswered(true))
  }, [event, calendar, user, reply, expected, dispatch, replyToOccurrence])

  return { isReplying: reply !== null && !isAnswered, hasChanged }
}

/**
 * Whether the close waited long enough: true 10 s after it was asked. The
 * client has no close button of its own here: a server that never answers
 * must not keep the user in the frame. A timer in an Effect, cleared when
 * the page goes.
 */
function useIsLate(isClosing: boolean): boolean {
  const [isLate, setIsLate] = useState(false)
  useEffect(() => {
    if (!isClosing) return
    const timer = setTimeout(() => setIsLate(true), CLOSE_WAIT_MS)
    return (): void => clearTimeout(timer)
  }, [isClosing])
  return isLate
}

/**
 * The close of the preview, held while a reply the user clicked is in
 * flight (sent by the buttons, then, for an occurrence, its reload): the
 * client removes the frame once it has its answer, which would abort that
 * reply and give it the former one. The reloads are counted, each click its
 * own: one ended says nothing of the others. The Effect closes once nothing
 * is in flight (or after 10 s: the former one then), with the reply then in
 * the store: the new one once the server confirmed it, the former one when
 * it refused it. Used by EventPreviewInPage.
 *
 * @returns what the close button calls, what AttendanceValidation tells of
 *   its replies, and the reply to an occurrence, followed
 */
export function useCloseOnceAnswered(
  reply: Reply | null,
  onClose: (reply: Reply | null) => void,
  replyToOccurrence: ReplyToOccurrence
): {
  close: () => void
  setIsSending: (isSending: boolean) => void
  replyToFollowedOccurrence: (updater: unknown) => void
} {
  const [isClosing, setIsClosing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [reloads, setReloads] = useState(0)
  const isLate = useIsLate(isClosing)
  const isInFlight = isSending || reloads > 0
  useEffect(() => {
    if (isClosing && (isLate || !isInFlight)) onClose(reply)
  }, [isClosing, isLate, isInFlight, reply, onClose])
  return {
    close: () => setIsClosing(true),
    setIsSending,
    replyToFollowedOccurrence: (updater): void => {
      setReloads(count => count + 1)
      void replyToOccurrence(updater).finally(() =>
        setReloads(count => count - 1)
      )
    }
  }
}
