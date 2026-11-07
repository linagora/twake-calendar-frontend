import { useAppSelector } from '@common/app/hooks'
import { getPendingReturnTo } from '@linagora/twake-oidc'

/**
 * TwakeSpace frames the team calendar of a space on this route, keyed by the
 * id the calendar side service published when it provisioned the space.
 */
export const EMBED_CALENDAR_PREFIX = '/embed/calendars/'
export const EMBED_CALENDAR_ROUTE = `${EMBED_CALENDAR_PREFIX}:teamCalendarId`
// An event of that calendar, shown in its preview: a card of the space's feed
// opens it
export const EMBED_EVENT_ROUTE = `${EMBED_CALENDAR_ROUTE}/events/:uid`

const EMBED_CALENDAR_PATH =
  /^\/embed\/calendars\/([\w-]+)(?:\/events\/([^/]+))?\/?$/

/**
 * Twake Chat frames the form of a new event on this route, in a dialog of a
 * room, with the members of the room as `attendee`s (as on /newEvent).
 */
export const EMBED_NEW_EVENT_ROUTE = '/embed/newEvent'
const EMBED_NEW_EVENT_PATH = /^\/embed\/newEvent\/?$/

// A path saved with the sign in keeps its query: the route is the part before
const routeOf = (path: string): string => path.split(/[?#]/, 1)[0]

/** Whether TwakeSpace frames a team calendar, or one of its events, there. */
export function isEmbedCalendarPath(path: string): boolean {
  return EMBED_CALENDAR_PATH.test(routeOf(path))
}

/** Whether Twake Chat frames the form of a new event there. */
export function isEmbedNewEventPath(path: string): boolean {
  return EMBED_NEW_EVENT_PATH.test(routeOf(path))
}

/**
 * Whether another page frames this path: its sign in is silent, returns
 * there, and leaves the calendars selection of the user as it is.
 */
export function isEmbedPath(path: string): boolean {
  return isEmbedCalendarPath(path) || isEmbedNewEventPath(path)
}

/**
 * Whether this document shows a route `isRoute` accepts, or the callback of
 * the silent sign in such a route started (the route it returns to is saved
 * with the sign in).
 */
export function showsEmbedRoute(
  isRoute: (path: string) => boolean,
  pathname: string = window.location.pathname
): boolean {
  if (isRoute(pathname)) return true
  if (pathname !== '/callback') return false
  const returnTo = getPendingReturnTo()
  return returnTo !== null && isRoute(returnTo)
}

/** The UID of the event the embed route shows, null when it shows none. */
export function useEmbeddedEventUid(): string | null {
  return useAppSelector(state => {
    const uid = EMBED_CALENDAR_PATH.exec(
      state.router?.location?.pathname ?? ''
    )?.[2]
    if (!uid) return null
    try {
      return decodeURIComponent(uid)
    } catch {
      return null
    }
  })
}

/**
 * The calendar the current route embeds, as its id in the calendar list, or
 * null outside an embed route. A team calendar lives at /calendars/<id>/<id>.
 */
export function useEmbeddedCalendarId(): string | null {
  return useAppSelector(state => {
    const id = EMBED_CALENDAR_PATH.exec(
      state.router?.location?.pathname ?? ''
    )?.[1]
    return id ? `${id}/${id}` : null
  })
}
