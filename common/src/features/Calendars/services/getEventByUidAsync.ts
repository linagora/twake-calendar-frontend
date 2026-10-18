import { RootState } from '@common/app/store'
import {
  calendarIdFromEventHref,
  fetchEventByUid
} from '@common/features/Calendars/CalendarDAO'
import { CalendarData } from '@common/features/Calendars/types/CalendarData'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { calendarDavPath } from '@common/features/Calendars/utils/calendarDavPath'
import { extractCalendarEvents } from '@common/features/Calendars/utils/extractCalendarEvents'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  httpStatusOf,
  toRejectedError,
  rejectedErrorMessage
} from '@common/utils/errorUtils'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

const EVENT_NOT_FOUND_ERROR = 'TRANSLATION:error.eventNotFound'

type FoundEvent = { calId: string; events: CalendarEvent[] }

export const getEventByUidThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    FoundEvent | null,
    // calId: the only calendar the event may belong to (the embed route)
    { userId: string; uid: string; calId?: string; signal?: AbortSignal },
    { rejectValue: RejectedError }
  >(
    async ({ userId, uid, calId, signal }, { rejectWithValue, getState }) => {
      const listed = Object.values((getState() as RootState).calendars.list)
      const calendars = calId ? listed.filter(cal => cal.id === calId) : listed
      try {
        return await findEventInHomes(
          searchedHomes(userId, calendars, Boolean(calId)),
          uid,
          calendars,
          signal
        )
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.pending = true
      },
      fulfilled: (state, action) => {
        state.pending = false
        if (!action.payload) {
          return
        }
        const { calId, events } = action.payload
        if (!state.list[calId]) {
          return
        }
        // Normalize only the newly fetched events, leaving the rest untouched.
        events.forEach(event => {
          state.list[calId].events[event.uid] = event
          state.list[calId].events[event.uid].color = state.list[calId].color
          state.list[calId].events[event.uid].calId = calId
          if (!state.list[calId].events[event.uid].timezone) {
            state.list[calId].events[event.uid].timezone =
              browserDefaultTimeZone
          }
        })
      },
      rejected: (state, action) => {
        state.pending = false
        // An unknown UID (typically a stale deep link) is answered with a 404:
        // show a translated message rather than the raw HTTP error.
        if (action.payload?.status === 404) {
          state.error = EVENT_NOT_FOUND_ERROR
          return
        }
        state.error = rejectedErrorMessage(
          action.payload,
          'TRANSLATION:error.cannotLoadEvent'
        )
      }
    }
  )

// The homes a UID lookup is sent to. The user's home does not search the team
// calendars the user reads, only the team's home does: the full app tries the
// user's home first, then the home of each other calendar it lists. The embed
// route only asks the homes of its calendar.
// A calendar delegated to the user (a team calendar they are a member of) is
// read through their own instance, whose home is the user's: the owner's home,
// taken from the calendar id, is asked too.
function searchedHomes(
  userId: string,
  calendars: Calendar[],
  onlyTheseCalendars: boolean
): string[] {
  const homes = calendars.flatMap(cal => [
    homeOf(ownerDavPath(cal)),
    homeOf(calendarDavPath(cal))
  ])
  return [...new Set(onlyTheseCalendars ? homes : [userId, ...homes])]
}

// The owner's node of a calendar, "/calendars/{owner}/{calendar}"
function ownerDavPath(cal: Calendar): string {
  return `/calendars/${cal.id}`
}

// "/calendars/{home}/{calendar}" → "{home}"
function homeOf(davPath: string): string {
  return davPath.split('/').filter(Boolean)[1]
}

// A home that does not hold the event answers 404 (403 when the user may not
// search it), so the next one is tried. When every home answers so, the first
// error is thrown: an unknown UID still reads "event not found".
async function findEventInHomes(
  homes: string[],
  uid: string,
  calendars: Calendar[],
  signal?: AbortSignal
): Promise<FoundEvent | null> {
  let firstMiss: Error | undefined
  let answered = false
  for (const home of homes) {
    try {
      const result = (await fetchEventByUid(home, uid, signal)) as CalendarData
      answered = true
      const found = resolveEvent(result, calendars)
      if (found) return found
    } catch (err) {
      if (!isMissingFromHome(err)) throw err
      firstMiss = firstMiss ?? (err as Error)
    }
  }
  if (!answered && firstMiss) throw firstMiss
  return null
}

function isMissingFromHome(err: unknown): boolean {
  const status = httpStatusOf(err)
  return status === 404 || status === 403
}

function resolveEvent(
  result: CalendarData,
  calendars: Calendar[]
): FoundEvent | null {
  const items = result._embedded?.['dav:item']
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }
  // A UID resolves to a single event (its master VEVENT plus any
  // recurrence overrides), so the first item holds everything we need.
  const item = items[0]
  const eventURL = item._links?.self?.href
  if (!eventURL) {
    return null
  }
  // The href names the calendar of the home that was searched: the user's own
  // instance of a calendar shared with them when found in the user's home, the
  // calendar itself when found in its owner's home (a team calendar).
  const calendarPath = `/calendars/${calendarIdFromEventHref(eventURL)}`
  const calendarStored = calendars.find(
    cal =>
      calendarDavPath(cal) === calendarPath ||
      ownerDavPath(cal) === calendarPath
  )
  if (!calendarStored) {
    return null
  }
  const events = extractCalendarEvents(item, {
    cal: calendarStored,
    color: calendarStored.color
  })
  return { calId: calendarStored.id, events }
}
