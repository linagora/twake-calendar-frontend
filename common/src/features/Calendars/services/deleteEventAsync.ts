import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { deleteEvent } from '@common/features/Events/EventDao'
import {
  httpStatusOf,
  rejectedErrorMessage,
  toRejectedError
} from '@common/utils/errorUtils'
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
        // already gone: a deletion sent again after a reload ends up here
        if (httpStatusOf(err) === 404) return { calId, eventId }
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.pending = true
      },
      fulfilled: state => {
        state.pending = false
        state.error = null
      },
      rejected: (state, action) => {
        state.pending = false
        state.error = rejectedErrorMessage(
          action.payload,
          'TRANSLATION:error.deleteEventFailed'
        )
      }
    }
  )
