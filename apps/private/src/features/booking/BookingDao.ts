import { api } from '@common/utils/apiUtils'
import {
  BookingLink,
  CreateBookingLinkRequest,
  CreateBookingLinkResponse,
  UpdateBookingLinkRequest,
  ResetBookingLinkResponse
} from '@common/features/booking/types/BookingTypes'

/**
 * Create a new booking link for the authenticated user.
 */
export async function createBookingLink(
  request: CreateBookingLinkRequest
): Promise<CreateBookingLinkResponse> {
  const response = await api.post('api/booking-links', { json: request })
  if (!response.ok) {
    throw new Error(`createBookingLink failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * List all booking links of the authenticated user (sorted by update time).
 */
export async function listBookingLinks(): Promise<BookingLink[]> {
  const response = await api.get('api/booking-links')
  if (!response.ok) {
    throw new Error(`listBookingLinks failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * Retrieve a booking link by its public ID.
 * Only returns the link if it belongs to the authenticated user.
 */
export async function getBookingLink(
  bookingLinkPublicId: string
): Promise<BookingLink> {
  const response = await api.get(
    `api/booking-links/${encodeURIComponent(bookingLinkPublicId)}`
  )
  if (!response.ok) {
    throw new Error(`getBookingLink failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * Partially update a booking link.
 * Only fields present in the request body are updated.
 */
export async function updateBookingLink(
  bookingLinkPublicId: string,
  request: UpdateBookingLinkRequest
): Promise<void> {
  const response = await api.patch(
    `api/booking-links/${encodeURIComponent(bookingLinkPublicId)}`,
    { json: request }
  )
  if (!response.ok) {
    throw new Error(`updateBookingLink failed with status ${response.status}`)
  }
}

/**
 * Delete a booking link.
 * Only deletes the link if it belongs to the authenticated user.
 */
export async function deleteBookingLink(
  bookingLinkPublicId: string
): Promise<void> {
  const response = await api.delete(
    `api/booking-links/${encodeURIComponent(bookingLinkPublicId)}`
  )
  if (!response.ok) {
    throw new Error(`deleteBookingLink failed with status ${response.status}`)
  }
}

/**
 * Generate a new public ID for an existing booking link, invalidating the old one.
 */
export async function resetBookingLink(
  bookingLinkPublicId: string
): Promise<ResetBookingLinkResponse> {
  const response = await api.post(
    `api/booking-links/${encodeURIComponent(bookingLinkPublicId)}/reset`
  )
  if (!response.ok) {
    throw new Error(`resetBookingLink failed with status ${response.status}`)
  }
  return response.json()
}
