import type { CalendarEvent } from '@common/types/EventsTypes'
import { isEmbedNewEventPath, showsEmbedRoute } from './embeddedCalendar'

const READY = 'twake-calendar:ready'
const HELLO = 'twake-calendar:hello'

type NewEventMessage =
  | { type: 'twake-calendar:closed' }
  | { type: 'twake-calendar:login-required' }
  | { type: 'twake-calendar:event-created'; event: CreatedEvent }

/** The event created, as Twake Chat reads it: start and end in ISO 8601. */
interface CreatedEvent {
  uid: string
  title: string
  start: string
  end: string
  allDay: boolean
  timeZone: string
  videoConferenceUrl: string | null
  url: string
}

function createdEvent(event: CalendarEvent): CreatedEvent {
  return {
    uid: event.uid,
    title: event.title ?? '',
    start: event.start,
    end: event.end ?? event.start,
    allDay: event.allday ?? false,
    timeZone: event.timezone,
    videoConferenceUrl: event.x_openpass_videoconference ?? null,
    // The deep link of the event (EventDeepLink)
    url: `${window.location.origin}/events/${encodeURIComponent(event.uid)}`
  }
}

/** What the new event form tells the page that frames it. */
export interface NewEventHost {
  /** The event is saved: its time, its video conference, its link here. */
  eventCreated: (event: CalendarEvent) => void
  /** The user closed or cancelled the form without saving. */
  closed: () => void
  /** The silent sign in was refused: the user must sign in at the top. */
  loginRequired: () => void
  disconnect: () => void
}

/**
 * The page that frames the new event form (Twake Chat), null out of its
 * route. The form does not know that page: once listening it asks its parent
 * for a greeting (`twake-calendar:ready`, to any origin, without data), takes
 * the first greeting that comes from its parent, and then posts to the
 * origin that greeted it alone. What happens before waits for the greeting.
 * Only a page `FRAME_ANCESTORS` allows can be that parent. `parent` is for
 * tests.
 */
export function connectNewEventHost(
  parent: Window = window.parent
): NewEventHost | null {
  if (!showsEmbedRoute(isEmbedNewEventPath)) return null

  let origin: string | null = null
  const waiting: NewEventMessage[] = []
  const post = (message: NewEventMessage): void => {
    if (origin === null) waiting.push(message)
    else parent.postMessage(message, origin)
  }
  const onMessage = (event: MessageEvent): void => {
    if (origin !== null || event.source !== parent) return
    if ((event.data as { type?: unknown } | null)?.type !== HELLO) return
    origin = event.origin
    waiting.splice(0).forEach(post)
  }

  window.addEventListener('message', onMessage)
  parent.postMessage({ type: READY }, '*')

  return {
    eventCreated: event =>
      post({
        type: 'twake-calendar:event-created',
        event: createdEvent(event)
      }),
    closed: () => post({ type: 'twake-calendar:closed' }),
    loginRequired: () => post({ type: 'twake-calendar:login-required' }),
    disconnect: () => window.removeEventListener('message', onMessage)
  }
}

// Connected at boot, on the callback page of the silent sign in too
export const newEventHost = connectNewEventHost()
