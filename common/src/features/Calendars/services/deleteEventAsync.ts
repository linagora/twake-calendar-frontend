import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { deleteEvent } from '@common/features/Events/EventDao'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const deleteEventThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    { calId: string; eventId: string },
    { calId: string; eventId: string; eventURL: string },
    { rejectValue: RejectedError }
  >(
    async ({ calId, eventId, eventURL }, { rejectWithValue }) => {
      try {
        await deleteEvent({ URL: eventURL })
        return { calId, eventId }
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
      fulfilled: state => {
        state.error = null
      },
      rejected: (state, action) => {
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to delete event'
      }
    }
  )
