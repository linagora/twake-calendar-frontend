import { deleteEvent } from '@/features/Events/EventDao'
import { toRejectedError } from '@/utils/errorUtils'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { RejectedError } from '../types/RejectedError'

export const deleteEventAsync = createAsyncThunk<
  { calId: string; eventId: string },
  { calId: string; eventId: string; eventURL: string },
  { rejectValue: RejectedError }
>(
  'calendars/delEvent',
  async ({ calId, eventId, eventURL }, { rejectWithValue }) => {
    try {
      await deleteEvent({ URL: eventURL })
      return { calId, eventId }
    } catch (err) {
      return rejectWithValue(toRejectedError(err))
    }
  }
)
