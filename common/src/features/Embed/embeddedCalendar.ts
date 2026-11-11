import { useAppSelector } from '@common/app/hooks'

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

export function isEmbedPath(pathname: string): boolean {
  return EMBED_CALENDAR_PATH.test(pathname)
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
