import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { updateBookingLink } from '../BookingDao'
import { BookingLinksState } from '../BookingLinksSlice'
import { BookingLink, UpdateBookingLinkRequest } from '../types/BookingTypes'

export function updateBookingLinkThunk(
  create: ReducerCreators<BookingLinksState>
) {
  return create.asyncThunk<
    { link: BookingLink },
    { publicId: string; request: UpdateBookingLinkRequest },
    { rejectValue: RejectedError }
  >(
    async ({ publicId, request }, { rejectWithValue }) => {
      try {
        await updateBookingLink(publicId, request)
        const { getBookingLink } = await import('../BookingDao')
        const link = await getBookingLink(publicId)
        return { link }
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
        // Replace the updated link in the list
        const index = state.list.findIndex(
          link => link.publicId === action.payload.link.publicId
        )
        if (index !== -1) {
          state.list[index] = action.payload.link
        }
      },
      rejected: (state, action) => {
        state.pending = false
        if (action.payload?.status !== 401) {
          state.error =
            action.payload?.message ||
            action.error.message ||
            'Failed to update booking link'
        }
      }
    }
  )
}
