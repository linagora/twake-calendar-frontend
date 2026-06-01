import { toRejectedError } from '@/utils/errorUtils'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { calendarAction } from '../CalendarDAO'
import { makeProppatchCalendarBody } from '../transformers'
import { RejectedError } from '../types/RejectedError'

export const patchCalendarAsync = createAsyncThunk<
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
  'calendars/patchCalendar',
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
  }
)
