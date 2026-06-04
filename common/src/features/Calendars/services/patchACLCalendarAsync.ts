import { updateCalendarAcl } from '@common/features/Calendars/CalendarDAO'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const patchACLCalendarThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    { calId: string; calLink: string; request: string },
    { calId: string; calLink: string; request: string },
    { rejectValue: RejectedError }
  >(
    async ({ calId, calLink, request }, { rejectWithValue }) => {
      try {
        await updateCalendarAcl(calLink, request)
        return { calId, calLink, request }
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
        state.list[action.payload.calId].visibility =
          action.payload.request !== '' ? 'public' : 'private'
        state.error = null
      },
      rejected: (state, action) => {
        state.pending = false
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to update calendar permissions'
      }
    }
  )
