import { type RootState } from '@common/app/store'
import { fetchCalendar } from '@common/features/Calendars/CalendarDAO'
import {
  CalendarData,
  CalendarItem
} from '@common/features/Calendars/types/CalendarData'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { extractCalendarEvents } from '@common/features/Calendars/utils/extractCalendarEvents'
import { CalendarEvent } from '@common/types/EventsTypes'
import { toRejectedError } from '@common/utils/errorUtils'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const getCalendarDetailThunk = (
  create: ReducerCreators<CalendarState>
) =>
  create.asyncThunk<
    {
      calId: string
      events: CalendarEvent[]
      calType?: string
      syncToken?: string
    },
    {
      calId: string
      match: { start: string; end: string }
      calType?: string
      signal?: AbortSignal
    },
    { rejectValue: RejectedError }
  >(
    async (
      { calId, match, calType, signal },
      { rejectWithValue, getState }
    ) => {
      try {
        const state = getState() as RootState
        const calendarStored =
          state.calendars[calType === 'temp' ? 'templist' : 'list'][calId]
        if (!calendarStored) {
          return rejectWithValue(
            toRejectedError(new Error(`Calendar ${calId} not found in store`))
          )
        }
        const calendar = (await fetchCalendar(
          calId,
          match,
          signal
        )) as CalendarData
        const syncToken = calendar._embedded?.['sync-token']

        const items = calendar._embedded?.['dav:item']
        const events: CalendarEvent[] = Array.isArray(items)
          ? items.flatMap((item: CalendarItem) =>
              extractCalendarEvents(item, {
                cal: calendarStored,
                color: calendarStored.color
              })
            )
          : []

        return { calId, events, calType, syncToken }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.pending = true
      },
      settled: state => {
        state.pending = false
      },
      fulfilled: (state, action) => {
        const type = action.payload.calType === 'temp' ? 'templist' : 'list'

        if (!state[type][action.payload.calId]) {
          return
        }
        state[type][action.payload.calId].syncToken = action.payload.syncToken
        action.payload.events.forEach(event => {
          state[type][action.payload.calId].events[event.uid] = event
        })
        Object.keys(state[type][action.payload.calId].events).forEach(id => {
          state[type][action.payload.calId].events[id].color =
            state[type][action.payload.calId].color
          state[type][action.payload.calId].events[id].calId =
            action.payload.calId
          if (!state[type][action.payload.calId].events[id].timezone) {
            state[type][action.payload.calId].events[id].timezone =
              browserDefaultTimeZone
          }
        })
      },
      rejected: (state, action) => {
        if (
          action.payload?.message.includes('aborted') ||
          action.error.name === 'AbortError'
        ) {
          return
        }
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to load calendar details'
      }
    }
  )
