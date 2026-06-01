import { calendarAction } from '@common/features/Calendars/CalendarDAO'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const removeCalendarThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    { calId: string },
    { calId: string; calLink: string },
    { rejectValue: RejectedError }
  >(
    async ({ calId, calLink }, { rejectWithValue }) => {
      try {
        await calendarAction('DELETE', calLink)
        return { calId }
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
          'Failed to remove calendar'
      }
    }
  )
