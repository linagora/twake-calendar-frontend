import { api } from '@common/utils/apiUtils'
import {
  fetchBookingSlots,
  createBooking
} from '@public/features/booking/BookingDao'
import {
  BookingSlotsResponse,
  CreateBookingRequest
} from '@common/features/booking/types/BookingTypes'

jest.mock('@common/utils/apiUtils', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn()
  }
}))

const mockSlotsResponse: BookingSlotsResponse = {
  durationMinutes: 30,
  range: {
    from: '2036-01-26T00:00:00Z',
    to: '2036-01-27T00:00:00Z'
  },
  slots: [
    { start: '2036-01-26T09:00:00Z' },
    { start: '2036-01-26T09:30:00Z' },
    { start: '2036-01-26T10:00:00Z' }
  ]
}

describe('Public Booking API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchBookingSlots', () => {
    it('should fetch slots successfully', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSlotsResponse)
      })

      const result = await fetchBookingSlots(
        '550e8400-e29b-41d4-a716-446655440000',
        '2036-01-26T00:00:00Z',
        '2036-01-27T00:00:00Z'
      )

      expect(api.get).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000/slots?from=2036-01-26T00%3A00%3A00Z&to=2036-01-27T00%3A00%3A00Z'
      )
      expect(result).toEqual(mockSlotsResponse)
    })

    it('should URL encode query parameters', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSlotsResponse)
      })

      await fetchBookingSlots(
        '550e8400-e29b-41d4-a716-446655440000',
        '2036-01-26T00:00:00+07:00',
        '2036-01-27T00:00:00+07:00'
      )

      expect(api.get).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000/slots?from=2036-01-26T00%3A00%3A00%2B07%3A00&to=2036-01-27T00%3A00%3A00%2B07%3A00'
      )
    })

    it('should throw error when response is not ok (400 - invalid range)', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(
        fetchBookingSlots(
          '550e8400-e29b-41d4-a716-446655440000',
          'invalid',
          'invalid'
        )
      ).rejects.toThrow('fetchBookingSlots failed with status 400')
    })

    it('should throw error when response is not ok (404 - link not found)', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(
        fetchBookingSlots(
          '550e8400-e29b-41d4-a716-446655440000',
          '2036-01-26T00:00:00Z',
          '2036-01-27T00:00:00Z'
        )
      ).rejects.toThrow('fetchBookingSlots failed with status 404')
    })
  })

  describe('createBooking', () => {
    const mockBookingRequest: CreateBookingRequest = {
      startUtc: '2036-01-26T09:00:00Z',
      creator: {
        name: 'BOB',
        email: 'creator@example.com'
      },
      additional_attendees: [
        {
          name: 'Nguyen Van A',
          email: 'vana@example.com'
        }
      ],
      eventTitle: '30-min intro call',
      visioLink: true,
      notes: 'Please call via Zoom.'
    }

    it('should create booking successfully', async () => {
      ;(api.post as jest.Mock).mockResolvedValue({
        ok: true
      })

      await createBooking(
        '550e8400-e29b-41d4-a716-446655440000',
        mockBookingRequest
      )

      expect(api.post).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000/book',
        { json: mockBookingRequest }
      )
    })

    it('should create booking without optional fields', async () => {
      const minimalRequest: CreateBookingRequest = {
        startUtc: '2036-01-26T09:00:00Z',
        creator: {
          email: 'creator@example.com'
        },
        eventTitle: '30-min intro call'
      }

      ;(api.post as jest.Mock).mockResolvedValue({
        ok: true
      })

      await createBooking(
        '550e8400-e29b-41d4-a716-446655440000',
        minimalRequest
      )

      expect(api.post).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000/book',
        { json: minimalRequest }
      )
    })

    it('should throw error when response is not ok (400 - invalid slot)', async () => {
      ;(api.post as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(
        createBooking(
          '550e8400-e29b-41d4-a716-446655440000',
          mockBookingRequest
        )
      ).rejects.toThrow('createBooking failed with status 400')
    })

    it('should throw error when response is not ok (404 - link not found)', async () => {
      ;(api.post as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(
        createBooking(
          '550e8400-e29b-41d4-a716-446655440000',
          mockBookingRequest
        )
      ).rejects.toThrow('createBooking failed with status 404')
    })

    it('should throw error when response is not ok (422 - business validation)', async () => {
      ;(api.post as jest.Mock).mockResolvedValue({
        ok: false,
        status: 422
      })

      await expect(
        createBooking(
          '550e8400-e29b-41d4-a716-446655440000',
          mockBookingRequest
        )
      ).rejects.toThrow('createBooking failed with status 422')
    })
  })
})
