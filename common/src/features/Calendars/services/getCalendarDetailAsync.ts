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
      fulfilled: (state, action) => {
        state.pending = false

        const { calId, events, calType, syncToken } = action.payload
        const type = calType === 'temp' ? 'templist' : 'list'

        if (!state[type][calId]) {
          return
        }
        state[type][calId].syncToken = syncToken
        events.forEach(event => {
          state[type][calId].events[event.uid] = event
          state[type][calId].events[event.uid].color = state[type][calId].color
          state[type][calId].events[event.uid].calId = calId
          if (!state[type][calId].events[event.uid].timezone) {
            state[type][calId].events[event.uid].timezone =
              browserDefaultTimeZone
          }
        })
      },
      rejected: (state, action) => {
        state.pending = false
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
