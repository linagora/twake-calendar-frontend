import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { deleteBookingLink } from '../BookingDao'
import { BookingLinksState } from '../BookingLinksSlice'

export function deleteBookingLinkThunk(
  create: ReducerCreators<BookingLinksState>
) {
  return create.asyncThunk<
    { publicId: string },
    string,
    { rejectValue: RejectedError }
  >(
    async (publicId, { rejectWithValue }) => {
      try {
        await deleteBookingLink(publicId)
        return { publicId }
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
        state.error = null
        state.list = state.list.filter(
          link => link.publicId !== action.payload.publicId
        )
      },
      rejected: (state, action) => {
        state.pending = false
        if (action.payload?.status !== 401) {
          state.error =
            action.payload?.message ||
            action.error.message ||
            'Failed to delete booking link'
        }
      }
    }
  )
}
