import {
  connectToTwakeSpace,
  embedRoute,
  type Metadata,
  type TwakeSpaceConnection
} from '@linagora/twake-embed'
import type { Calendar } from '@common/types/CalendarTypes'
import { EMBED_CALENDAR_PREFIX, isEmbedPath } from './embeddedCalendar'
import { connectSpaceOverlay, type SpaceOverlay } from './spaceOverlay'

const TEAM_CALENDAR_ID = /^[\w-]+$/
const UPCOMING_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Whether this document is the one TwakeSpace frames: an embed route, or the
 * callback of the silent sign in that an embed route started (the route it
 * returns to is saved with the sign in). The application is framed elsewhere
 * too, by the Cozy workplace, where nothing of this applies.
 */
export function isFramedByTwakeSpace(
  pathname: string = window.location.pathname
): boolean {
  if (isEmbedPath(pathname)) return true
  if (pathname !== '/callback') return false
  try {
    const saved = JSON.parse(
      sessionStorage.getItem('redirectState') ?? 'null'
    ) as { returnTo?: unknown } | null
    return typeof saved?.returnTo === 'string' && isEmbedPath(saved.returnTo)
  } catch {
    return false
  }
}

/**
 * The connection to TwakeSpace when it frames the application, null when the
 * application runs on its own or is framed by another page. The application
 * does not know where TwakeSpace is: TwakeSpace greets the frame, and the
 * application answers the origin that greeted it. Only a page
 * `FRAME_ANCESTORS` allows can be that parent. `parent` is for tests.
 */
export function connectCalendarToTwakeSpace(
  parent?: Window
): TwakeSpaceConnection | null {
  if (!isFramedByTwakeSpace()) return null
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
 * Opens a video meeting in the call window of TwakeSpace when it frames the
 * application (`twake-embed:pip`), and says so: the caller then leaves the
 * link alone. False on its own, where the link opens a new tab as usual.
 */
export function openMeetingInTwakeSpace(
  url: string,
  space: TwakeSpaceConnection | null = twakeSpace
): boolean {
  if (space === null) return false
  space.openPip(url)
  return true
}

/**
 * What TwakeSpace shows on the home of each space: the events of its team
 * calendar from now through the next 7 days, keyed by the id of its embed
 * route (a team calendar lives at /calendars/<id>/<id>). Counted from the
 * events loaded so far: the embed route loads the week shown and the next.
 */
export function countUpcomingEvents(
  calendars: Record<string, Calendar>,
  now: number = Date.now()
): Metadata[] {
  const end = now + UPCOMING_DAYS * DAY_MS
  return Object.values(calendars)
    .filter(calendar => calendar.owner?.teamCalendar)
    .map(calendar => ({
      resourceId: calendar.id.split('/')[0],
      name: 'events.upcoming',
      value: Object.values(calendar.events ?? {}).filter(event => {
        const start = Date.parse(event.start)
        return start >= now && start <= end
      }).length
    }))
}

/**
 * Reports the upcoming events of every team calendar to TwakeSpace, and again
 * whenever the store changes them. Returns the function that stops it.
 */
export function reportUpcomingEventsToTwakeSpace(
  space: TwakeSpaceConnection,
  store: {
    getState: () => { calendars: { list: Record<string, Calendar> } }
    subscribe: (listener: () => void) => () => void
  }
): () => void {
  let last = ''
  const report = (): void => {
    const metadata = countUpcomingEvents(store.getState().calendars.list)
    const key = JSON.stringify(metadata)
    if (key === last) return
    last = key
    space.reportMetadata(metadata)
  }
  report()
  return store.subscribe(report)
}

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
