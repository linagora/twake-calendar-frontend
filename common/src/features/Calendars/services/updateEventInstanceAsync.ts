import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import {
  fetchAllRecurrentVevents,
  putEvent
} from '@common/features/Events/EventDao'
import { makeEventWithOverrides } from '@common/features/Events/transformers/makeEventWithOverrides'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const updateEventInstanceThunk = (
  create: ReducerCreators<CalendarState>
) =>
  create.asyncThunk<
    { calId: string; event: CalendarEvent },
    { cal: Calendar; event: CalendarEvent },
    { rejectValue: RejectedError }
  >(
    async ({ cal, event }, { rejectWithValue }) => {
      try {
        const vevents = await fetchAllRecurrentVevents(event)
        const jCal = makeEventWithOverrides(
          event,
          vevents,
          cal.owner?.emails?.[0]
        )
        await putEvent(event, jCal)

        return { calId: cal.id, event }
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
        const calendar = state.list[action.payload.calId]
        state.error = null

        if (!calendar?.events) {
          return
        }

        calendar.events[action.payload.event.uid] = action.payload.event
      },
      rejected: (state, action) => {
        state.pending = false
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to update event instance'
      }
    }
  )
