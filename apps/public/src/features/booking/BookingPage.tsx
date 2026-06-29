import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { fetchBookingSlots } from './BookingDao'

export const BookingPage: React.FC = () => {
  const { bookingLinkPublicId } = useParams<{
    bookingLinkPublicId: string
  }>()

  useEffect(() => {
    const loadBookingData = async (): Promise<void> => {
      if (!bookingLinkPublicId) {
        return
      }

      try {
        const now = new Date()
        // First day of current month
        const from = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString()
        // Day 0 of next month = last day of current month
        const to = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).toISOString()

        await fetchBookingSlots(bookingLinkPublicId, from, to)
      } catch {
        // TODO: Surface error to UI when BookingPage is implemented
      }
    }

    loadBookingData()
  }, [bookingLinkPublicId])

  // TODO: This page is scaffolding. Implement slot selection and booking form.
  return null
}

export default BookingPage
