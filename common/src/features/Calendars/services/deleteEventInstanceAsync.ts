import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import {
  fetchAllRecurrentVevents,
  putEvent
} from '@common/features/Events/EventDao'
import { makeDeleteEventInstanceJCal } from '@common/features/Events/transformers/makeDeleteEventInstanceJCal'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { formatReduxError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const deleteEventInstanceThunk = (
  create: ReducerCreators<CalendarState>
) =>
  create.asyncThunk<
    { calId: string; eventId: string },
    { cal: Calendar; event: CalendarEvent },
    { rejectValue: RejectedError }
  >(
    async ({ cal, event }, { rejectWithValue }) => {
      try {
        const vevents = await fetchAllRecurrentVevents(event)
        const newJCal = makeDeleteEventInstanceJCal(vevents, event)
        await putEvent(event, newJCal)

        return { calId: cal.id, eventId: event.uid }
      } catch (err) {
        const error = err as { response?: { status?: number } }
        return rejectWithValue({
          message: formatReduxError(err),
          status: error.response?.status
        })
      }
    },
    {
      pending: state => {
        state.pending = true
      },
      fulfilled: (state, action) => {
        state.pending = false
        delete state.list[action.payload.calId].events[action.payload.eventId]
        state.error = null
      },
      rejected: (state, action) => {
        state.pending = false
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to delete event instance'
      }
    }
  )
