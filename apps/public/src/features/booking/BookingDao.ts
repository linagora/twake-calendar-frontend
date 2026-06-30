import {
  BookingSlotsResponse,
  CreateBookingRequest,
  CreateBookingResponse
} from '@common/features/booking/types/BookingTypes'
import { api } from '@common/utils/apiUtils'

/**
 * Fetch available slots for a public booking link.
 * No authentication required.
 */
export async function fetchBookingSlots(
  bookingLinkPublicId: string,
  from: string,
  to: string,
  timeZone?: string
): Promise<BookingSlotsResponse> {
  const params = new URLSearchParams({ from, to })
  if (timeZone) {
    params.set('timeZone', timeZone)
  }
  const response = await api.get(
    `api/booking-links/${encodeURIComponent(bookingLinkPublicId)}/slots?${params}`
  )
  if (!response.ok) {
    throw new Error(`fetchBookingSlots failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * Create a booking on a selected slot for a public booking link.
 * No authentication required.
 * Returns a bookingConfirmationToken that can be used to cancel the booking.
 */
export async function createBooking(
  bookingLinkPublicId: string,
  request: CreateBookingRequest
): Promise<CreateBookingResponse> {
  const response = await api.post(
    `api/booking-links/${encodeURIComponent(bookingLinkPublicId)}/book`,
    { json: request }
  )
  if (!response.ok) {
    throw new Error(`createBooking failed with status ${response.status}`)
  }
  return response.json()
}
