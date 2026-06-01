import { moveEvent } from '@common/features/Events/EventDao'
import { CalendarEvent } from '@common/types/EventsTypes'
import { toRejectedError } from '@common/utils/errorUtils'
import { Calendar } from '@common/types/CalendarTypes'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const moveEventThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    { calId: string },
    { cal: Calendar; newEvent: CalendarEvent; newURL: string },
    { rejectValue: RejectedError }
  >(
    async ({ cal, newEvent, newURL }, { rejectWithValue }) => {
      try {
        await moveEvent(newEvent, newURL)

        return {
          calId: cal.id
        }
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
          'Failed to move event'
      }
    }
  )
