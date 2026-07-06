import { api } from '@common/utils/apiUtils'
import { BookingLink } from './types/BookingTypes'

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
