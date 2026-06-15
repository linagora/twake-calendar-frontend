import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { putEvent } from '@common/features/Events/EventDao'
import { calendarEventToJCal } from '@common/features/Events/utils'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const putEventThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    { calId: string; calType?: 'temp' },
    { cal: Calendar; newEvent: CalendarEvent; calType?: 'temp' },
    { rejectValue: RejectedError }
  >(
    async ({ cal, newEvent, calType }, { rejectWithValue }) => {
      try {
        const jCal = calendarEventToJCal(newEvent)
        await putEvent(newEvent, jCal)

        return {
          calId: cal.id,
          calType
        }
      } catch (err) {
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
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to create event'
      }
    }
  )
