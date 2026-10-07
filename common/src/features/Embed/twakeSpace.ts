import {
  connectToTwakeSpace,
  embedRoute,
  type TwakeSpaceConnection
} from '@linagora/twake-embed'
import { EMBED_CALENDAR_PREFIX } from './embeddedCalendar'

const TEAM_CALENDAR_ID = /^[\w-]+$/

/**
 * The connection to TwakeSpace when it frames the application on an embed
 * route, null when the application runs on its own. `parent` is for tests.
 */
export function connectCalendarToTwakeSpace(
  parent?: Window
): TwakeSpaceConnection | null {
  return connectToTwakeSpace({
    hostOrigins: window.TWAKE_SPACE_ORIGIN?.split(' ').filter(Boolean) ?? [],
    embedPrefix: EMBED_CALENDAR_PREFIX,
    isResourceId: id => TEAM_CALENDAR_ID.test(id),
    parent
  })
}

// Connected at boot, on the callback page of the silent login too
export const twakeSpace = connectCalendarToTwakeSpace()

/**
 * Leaves the browser history to TwakeSpace: it moves the frame to a team
 * calendar (another space, Back, Forward, a deep link) and the router
 * replaces its URL, never adding an entry. Returns the function that stops it.
 */
export function syncHistoryWithTwakeSpace(
  space: TwakeSpaceConnection,
  history: { replace: (path: string) => void }
): () => void {
  const show = (calendarId: string, path: string): void => {
    history.replace(embedRoute(EMBED_CALENDAR_PREFIX, calendarId) + path)
  }
  return space.syncHistory({ onLoad: show, onNavigate: show })
}
