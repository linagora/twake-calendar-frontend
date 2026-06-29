import { api } from '@common/utils/apiUtils'
import {
  createBookingLink,
  listBookingLinks,
  getBookingLink,
  updateBookingLink,
  deleteBookingLink,
  resetBookingLink
} from '@private/features/booking/BookingDao'
import {
  BookingLink,
  CreateBookingLinkRequest,
  UpdateBookingLinkRequest
} from '@common/features/booking/types/BookingTypes'

jest.mock('@common/utils/apiUtils', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}))

const mockBookingLink: BookingLink = {
  publicId: '550e8400-e29b-41d4-a716-446655440000',
  calendarUrl: '/calendars/67c3a792e4b0884b05ef8aef/67c3a792e4b0884b05ef8aef',
  durationMinutes: 30,
  active: true,
  autoAccept: false,
  name: 'Intro call',
  description: 'Book a 30-minute introduction call',
  availabilityRules: [
    {
      type: 'weekly',
      dayOfWeek: 'MON',
      start: '09:00',
      end: '17:00',
      timeZone: 'Asia/Ho_Chi_Minh'
    }
  ]
}

describe('Private Booking Link API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createBookingLink', () => {
    it('should create booking link with all fields', async () => {
      const request: CreateBookingLinkRequest = {
        calendarUrl:
          '/calendars/67c3a792e4b0884b05ef8aef/67c3a792e4b0884b05ef8aef',
        durationMinutes: 30,
        active: true,
        autoAccept: false,
        name: 'Intro call',
        description: 'Book a 30-minute introduction call',
        availabilityRules: [
          {
            type: 'weekly',
            dayOfWeek: 'MON',
            start: '09:00',
            end: '12:00',
            timeZone: 'Asia/Ho_Chi_Minh'
          },
          {
            type: 'weekly',
            dayOfWeek: 'MON',
            start: '13:00',
            end: '17:00',
            timeZone: 'Europe/London'
          },
          {
            type: 'fixed',
            start: '2026-01-26T02:00:00',
            end: '2026-01-30T02:00:00',
            timeZone: 'UTC'
          }
        ]
      }

      ;(api.post as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          bookingLinkPublicId: '550e8400-e29b-41d4-a716-446655440000'
        })
      })

      const result = await createBookingLink(request)

      expect(api.post).toHaveBeenCalledWith('api/booking-links', {
        json: request
      })
      expect(result).toEqual({
        bookingLinkPublicId: '550e8400-e29b-41d4-a716-446655440000'
      })
    })

    it('should create booking link with minimal fields', async () => {
      const request: CreateBookingLinkRequest = {
        calendarUrl:
          '/calendars/67c3a792e4b0884b05ef8aef/67c3a792e4b0884b05ef8aef',
        durationMinutes: 30,
        active: true
      }

      ;(api.post as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          bookingLinkPublicId: '550e8400-e29b-41d4-a716-446655440000'
        })
      })

      const result = await createBookingLink(request)

      expect(api.post).toHaveBeenCalledWith('api/booking-links', {
        json: request
      })
      expect(result).toEqual({
        bookingLinkPublicId: '550e8400-e29b-41d4-a716-446655440000'
      })
    })

    it('should throw error when response is not ok (400 - invalid field)', async () => {
      const request: CreateBookingLinkRequest = {
        calendarUrl: '/calendars/invalid',
        durationMinutes: -1,
        active: true
      }

      ;(api.post as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(createBookingLink(request)).rejects.toThrow(
        'createBookingLink failed with status 400'
      )
    })

    it('should throw error when response is not ok (401 - unauthenticated)', async () => {
      const request: CreateBookingLinkRequest = {
        calendarUrl:
          '/calendars/67c3a792e4b0884b05ef8aef/67c3a792e4b0884b05ef8aef',
        durationMinutes: 30,
        active: true
      }

      ;(api.post as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401
      })

      await expect(createBookingLink(request)).rejects.toThrow(
        'createBookingLink failed with status 401'
      )
    })
  })

  describe('listBookingLinks', () => {
    it('should list all booking links', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([mockBookingLink])
      })

      const result = await listBookingLinks()

      expect(api.get).toHaveBeenCalledWith('api/booking-links')
      expect(result).toEqual([mockBookingLink])
    })

    it('should return empty array when no booking links', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([])
      })

      const result = await listBookingLinks()

      expect(result).toEqual([])
    })

    it('should throw error when response is not ok (401 - unauthenticated)', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401
      })

      await expect(listBookingLinks()).rejects.toThrow(
        'listBookingLinks failed with status 401'
      )
    })
  })

  describe('getBookingLink', () => {
    it('should get booking link by public ID', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockBookingLink)
      })

      const result = await getBookingLink(
        '550e8400-e29b-41d4-a716-446655440000'
      )

      expect(api.get).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000'
      )
      expect(result).toEqual(mockBookingLink)
    })

    it('should URL encode the public ID', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockBookingLink)
      })

      await getBookingLink('test/id:with+special')

      expect(api.get).toHaveBeenCalledWith(
        'api/booking-links/test%2Fid%3Awith%2Bspecial'
      )
    })

    it('should throw error when response is not ok (400 - invalid UUID)', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(getBookingLink('invalid-uuid')).rejects.toThrow(
        'getBookingLink failed with status 400'
      )
    })

    it('should throw error when response is not ok (401 - unauthenticated)', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401
      })

      await expect(
        getBookingLink('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow('getBookingLink failed with status 401')
    })

    it('should throw error when response is not ok (404 - not found)', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(
        getBookingLink('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow('getBookingLink failed with status 404')
    })
  })

  describe('updateBookingLink', () => {
    it('should update booking link partially', async () => {
      const request: UpdateBookingLinkRequest = {
        durationMinutes: 60,
        active: false
      }

      ;(api.patch as jest.Mock).mockResolvedValue({
        ok: true
      })

      await updateBookingLink('550e8400-e29b-41d4-a716-446655440000', request)

      expect(api.patch).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000',
        { json: request }
      )
    })

    it('should update availability rules', async () => {
      const request: UpdateBookingLinkRequest = {
        availabilityRules: [
          {
            type: 'weekly',
            dayOfWeek: 'FRI',
            start: '14:00',
            end: '18:00',
            timeZone: 'UTC'
          }
        ]
      }

      ;(api.patch as jest.Mock).mockResolvedValue({
        ok: true
      })

      await updateBookingLink('550e8400-e29b-41d4-a716-446655440000', request)

      expect(api.patch).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000',
        { json: request }
      )
    })

    it('should remove availability rules with null', async () => {
      const request: UpdateBookingLinkRequest = {
        availabilityRules: null
      }

      ;(api.patch as jest.Mock).mockResolvedValue({
        ok: true
      })

      await updateBookingLink('550e8400-e29b-41d4-a716-446655440000', request)

      expect(api.patch).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000',
        { json: request }
      )
    })

    it('should remove name and description with null', async () => {
      const request: UpdateBookingLinkRequest = {
        name: null,
        description: null
      }

      ;(api.patch as jest.Mock).mockResolvedValue({
        ok: true
      })

      await updateBookingLink('550e8400-e29b-41d4-a716-446655440000', request)

      expect(api.patch).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000',
        { json: request }
      )
    })

    it('should throw error when response is not ok (400 - invalid value)', async () => {
      const request: UpdateBookingLinkRequest = {
        durationMinutes: -1
      }

      ;(api.patch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(
        updateBookingLink('550e8400-e29b-41d4-a716-446655440000', request)
      ).rejects.toThrow('updateBookingLink failed with status 400')
    })

    it('should URL encode the public ID', async () => {
      const request: UpdateBookingLinkRequest = {
        active: false
      }

      ;(api.patch as jest.Mock).mockResolvedValue({
        ok: true
      })

      await updateBookingLink('test/id:with+special', request)

      expect(api.patch).toHaveBeenCalledWith(
        'api/booking-links/test%2Fid%3Awith%2Bspecial',
        { json: request }
      )
    })

    it('should throw error when response is not ok (404 - not found)', async () => {
      const request: UpdateBookingLinkRequest = {
        active: false
      }

      ;(api.patch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(
        updateBookingLink('550e8400-e29b-41d4-a716-446655440000', request)
      ).rejects.toThrow('updateBookingLink failed with status 404')
    })
  })

  describe('deleteBookingLink', () => {
    it('should delete booking link successfully', async () => {
      ;(api.delete as jest.Mock).mockResolvedValue({
        ok: true
      })

      await deleteBookingLink('550e8400-e29b-41d4-a716-446655440000')

      expect(api.delete).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000'
      )
    })

    it('should URL encode the public ID', async () => {
      ;(api.delete as jest.Mock).mockResolvedValue({
        ok: true
      })

      await deleteBookingLink('test/id:with+special')

      expect(api.delete).toHaveBeenCalledWith(
        'api/booking-links/test%2Fid%3Awith%2Bspecial'
      )
    })

    it('should throw error when response is not ok (400 - invalid UUID)', async () => {
      ;(api.delete as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(deleteBookingLink('invalid-uuid')).rejects.toThrow(
        'deleteBookingLink failed with status 400'
      )
    })

    it('should throw error when response is not ok (404 - not found)', async () => {
      ;(api.delete as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(
        deleteBookingLink('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow('deleteBookingLink failed with status 404')
    })
  })

  describe('resetBookingLink', () => {
    it('should reset booking link and return new public ID', async () => {
      ;(api.post as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          bookingLinkPublicId: '9f4f2166-95c4-4d3e-b421-23dc5e8a1fbb'
        })
      })

      const result = await resetBookingLink(
        '550e8400-e29b-41d4-a716-446655440000'
      )

      expect(api.post).toHaveBeenCalledWith(
        'api/booking-links/550e8400-e29b-41d4-a716-446655440000/reset'
      )
      expect(result).toEqual({
        bookingLinkPublicId: '9f4f2166-95c4-4d3e-b421-23dc5e8a1fbb'
      })
    })

    it('should throw error when response is not ok (400 - invalid UUID)', async () => {
      ;(api.post as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(resetBookingLink('invalid-uuid')).rejects.toThrow(
        'resetBookingLink failed with status 400'
      )
    })

    it('should throw error when response is not ok (404 - not found)', async () => {
      ;(api.post as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(
        resetBookingLink('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow('resetBookingLink failed with status 404')
    })
  })
})
