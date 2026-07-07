import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { listBookingLinks } from '../BookingDao'
import { BookingLinksState } from '../BookingLinksSlice'
import { BookingLink } from '../types/BookingTypes'

export function listBookingLinksThunk(
  create: ReducerCreators<BookingLinksState>
) {
  return create.asyncThunk<
    { links: BookingLink[] },
    void,
    { rejectValue: RejectedError }
  >(
    async (_, { rejectWithValue }) => {
      try {
        const links = await listBookingLinks()
        return { links }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.pending = true
        state.error = null
      },
      fulfilled: (state, action) => {
        state.pending = false
        state.list = action.payload.links
      },
      rejected: (state, action) => {
        state.pending = false
        if (action.payload?.status !== 401) {
          state.error =
            action.payload?.message ||
            action.error.message ||
            'Failed to load booking links'
        }
      }
    }
  )
}
