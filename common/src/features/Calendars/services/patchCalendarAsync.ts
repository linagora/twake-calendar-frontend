import { toRejectedError } from '@common/utils/errorUtils'
import { calendarAction } from '@common/features/Calendars/CalendarDAO'
import { makeProppatchCalendarBody } from '@common/features/Calendars/transformers'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const patchCalendarThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    {
      calId: string
      calLink: string
      patch: { name: string; desc: string; color: Record<string, string> }
    },
    {
      calId: string
      calLink: string
      patch: { name: string; desc: string; color: Record<string, string> }
    },
    { rejectValue: RejectedError }
  >(
    async ({ calId, calLink, patch }, { rejectWithValue }) => {
      try {
        const body = makeProppatchCalendarBody(patch)
        await calendarAction('PROPPATCH', calLink, body)
        return {
          calId,
          calLink,
          patch
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
          'Failed to update calendar'
      }
    }
  )
