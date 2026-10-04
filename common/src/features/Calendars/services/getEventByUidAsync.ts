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
import { toRejectedError } from '@common/utils/errorUtils'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

const EVENT_NOT_FOUND_ERROR = 'TRANSLATION:error.eventNotFound'

export const getEventByUidThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    { calId: string; events: CalendarEvent[] } | null,
    { userId: string; uid: string; signal?: AbortSignal },
    { rejectValue: RejectedError }
  >(
    async ({ userId, uid, signal }, { rejectWithValue, getState }) => {
      try {
        const result = (await fetchEventByUid(
          userId,
          uid,
          signal
        )) as CalendarData
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
        // The href names the calendar the user read it through: for a calendar
        // shared with them, their own instance of it rather than its id.
        const calendarPath = `/calendars/${calendarIdFromEventHref(eventURL)}`
        const state = getState() as RootState
        const calendarStored: Calendar | undefined = Object.values(
          state.calendars.list
        ).find(cal => calendarDavPath(cal) === calendarPath)
        if (!calendarStored) {
          return null
        }
        const calId: string = calendarStored.id
        const events = extractCalendarEvents(item, {
          cal: calendarStored,
          color: calendarStored.color
        })

        return { calId, events }
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
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to load event'
      }
    }
  )
