import {
  connectToTwakeSpace,
  embedRoute,
  type TwakeSpaceConnection
} from '@linagora/twake-embed'
import { EMBED_CALENDAR_PREFIX } from './embeddedCalendar'
import { connectSpaceOverlay, type SpaceOverlay } from './spaceOverlay'

const TEAM_CALENDAR_ID = /^[\w-]+$/

/**
 * The connection to TwakeSpace when it frames the application, null when the
 * application runs on its own. The application does not know where
 * TwakeSpace is: TwakeSpace greets the frame, and the application answers the
 * origin that greeted it. Only a page `FRAME_ANCESTORS` allows can be that
 * parent. `parent` is for tests.
 */
export function connectCalendarToTwakeSpace(
  parent?: Window
): TwakeSpaceConnection | null {
  return connectToTwakeSpace({
    embedPrefix: EMBED_CALENDAR_PREFIX,
    isResourceId: id => TEAM_CALENDAR_ID.test(id),
    parent
  })
}

// Connected at boot, on the callback page of the silent login too
export const twakeSpace = connectCalendarToTwakeSpace()

/**
 * The overlay TwakeSpace frames next to the application, on its origin:
 * dialogs and drawers render there, over the whole page of TwakeSpace, which
 * shows the region the application draws in. Null on its own.
 */
export const spaceOverlay: SpaceOverlay | null =
  twakeSpace === null
    ? null
    : connectSpaceOverlay(region => {
        twakeSpace.reportOverlayRegion(region)
      })

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
