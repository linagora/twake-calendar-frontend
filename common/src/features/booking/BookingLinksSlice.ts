import { createAppSlice } from '@common/app/createAppSlice'
import { deleteBookingLinkThunk } from './services/deleteBookingLinkThunk'
import { listBookingLinksThunk } from './services/listBookingLinksThunk'
import { updateBookingLinkThunk } from './services/updateBookingLinkThunk'
import { BookingLink } from './types/BookingTypes'

export interface BookingLinksState {
  list: BookingLink[]
  pending: boolean
  error: string | null
}

const BookingLinksSlice = createAppSlice({
  name: 'bookingLinks',
  initialState: {
    list: [] as BookingLink[],
    pending: false,
    error: null as string | null
  } as BookingLinksState,
  reducers: create => ({
    listBookingLinks: listBookingLinksThunk(create),
    deleteBookingLink: deleteBookingLinkThunk(create),
    updateBookingLink: updateBookingLinkThunk(create)
  })
})

export const { listBookingLinks, deleteBookingLink, updateBookingLink } =
  BookingLinksSlice.actions

export default BookingLinksSlice.reducer
