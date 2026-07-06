import {
  BookingSlotsResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  BookedEventResponse
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
    const body = await response.text()
    throw new Error(
      body || `createBooking failed with status ${response.status}`
    )
  }
  return response.json()
}

/**
 * Cancel a previously booked event using the confirmation token.
 * No authentication required.
 */
export async function cancelBookedEvent(
  bookingConfirmationToken: string
): Promise<void> {
  const params = new URLSearchParams({ bookingConfirmationToken })
  const response = await api.delete(`api/booked-event?${params}`)
  if (!response.ok) {
    throw new Error(`cancelBookedEvent failed with status ${response.status}`)
  }
}

/**
 * Retrieve the details of a previously booked event using the confirmation token.
 * No authentication required.
 */
export async function getBookedEvent(
  bookingConfirmationToken: string
): Promise<BookedEventResponse> {
  const params = new URLSearchParams({ bookingConfirmationToken })
  const response = await api.get(`api/booked-event?${params}`)
  if (!response.ok) {
    throw new Error(`getBookedEvent failed with status ${response.status}`)
  }
  return response.json()
}
