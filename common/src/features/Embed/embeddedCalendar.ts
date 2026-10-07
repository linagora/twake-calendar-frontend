import { useAppSelector } from '@common/app/hooks'

/**
 * TwakeSpace frames the team calendar of a space on this route, keyed by the
 * id the calendar side service published when it provisioned the space.
 */
export const EMBED_CALENDAR_PREFIX = '/embed/calendars/'
export const EMBED_CALENDAR_ROUTE = `${EMBED_CALENDAR_PREFIX}:teamCalendarId`

const EMBED_CALENDAR_PATH = /^\/embed\/calendars\/([\w-]+)\/?$/

export function isEmbedPath(pathname: string): boolean {
  return EMBED_CALENDAR_PATH.test(pathname)
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
