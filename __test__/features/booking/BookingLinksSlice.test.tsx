import { configureStore } from '@reduxjs/toolkit'
import reducer, {
  listBookingLinks,
  deleteBookingLink,
  updateBookingLink
} from '@common/features/booking/BookingLinksSlice'
import * as bookingDAO from '@common/features/booking/BookingDao'
import { BookingLink } from '@common/features/booking/types/BookingTypes'

jest.mock('@common/features/booking/BookingDao')

const mockBookingLink: BookingLink = {
  publicId: '550e8400-e29b-41d4-a716-446655440000',
  calendarUrl: '/calendars/67c3a792e4b0884b05ef8aef',
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

const mockBookingLink2: BookingLink = {
  publicId: '660f9511-f30c-52e5-b827-557766551111',
  calendarUrl: '/calendars/67c3a792e4b0884b05ef8aef',
  durationMinutes: 60,
  active: true,
  autoAccept: false,
  name: 'Deep dive',
  description: 'Book a 60-minute deep dive session',
  availabilityRules: [
    {
      type: 'weekly',
      dayOfWeek: 'TUE',
      start: '10:00',
      end: '16:00',
      timeZone: 'UTC'
    }
  ]
}

describe('BookingLinksSlice', () => {
  const initialState = {
    list: [] as BookingLink[],
    pending: false,
    error: null as string | null
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('listBookingLinks thunk', () => {
    it('should fetch and store booking links', async () => {
      const store = configureStore({ reducer })
      ;(bookingDAO.listBookingLinks as jest.Mock).mockResolvedValue([
        mockBookingLink,
        mockBookingLink2
      ])

      await store.dispatch(listBookingLinks())

      const state = store.getState()
      expect(state.list).toHaveLength(2)
      expect(state.list[0].publicId).toBe(mockBookingLink.publicId)
      expect(state.list[1].publicId).toBe(mockBookingLink2.publicId)
      expect(state.pending).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle error when fetching fails', async () => {
      const store = configureStore({ reducer })
      ;(bookingDAO.listBookingLinks as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      await store.dispatch(listBookingLinks())

      const state = store.getState()
      expect(state.list).toHaveLength(0)
      expect(state.pending).toBe(false)
      expect(state.error).toBe('Network error')
    })
  })

  describe('deleteBookingLink thunk', () => {
    it('should remove booking link from state', async () => {
      const store = configureStore({
        reducer,
        preloadedState: {
          ...initialState,
          list: [mockBookingLink, mockBookingLink2]
        }
      })
      ;(bookingDAO.deleteBookingLink as jest.Mock).mockResolvedValue(undefined)

      await store.dispatch(deleteBookingLink(mockBookingLink.publicId))

      const state = store.getState()
      expect(state.list).toHaveLength(1)
      expect(state.list[0].publicId).toBe(mockBookingLink2.publicId)
    })

    it('should handle delete error', async () => {
      const store = configureStore({
        reducer,
        preloadedState: {
          ...initialState,
          list: [mockBookingLink]
        }
      })
      ;(bookingDAO.deleteBookingLink as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      )

      await store.dispatch(deleteBookingLink(mockBookingLink.publicId))

      const state = store.getState()
      // Should not remove from list on error
      expect(state.list).toHaveLength(1)
      expect(state.error).toBe('Delete failed')
    })
  })

  describe('updateBookingLink thunk', () => {
    it('should update booking link in state', async () => {
      const store = configureStore({
        reducer,
        preloadedState: {
          ...initialState,
          list: [mockBookingLink, mockBookingLink2]
        }
      })

      const updatedLink: BookingLink = {
        ...mockBookingLink,
        name: 'Updated Intro Call',
        durationMinutes: 45
      }

      ;(bookingDAO.updateBookingLink as jest.Mock).mockResolvedValue(undefined)
      ;(bookingDAO.getBookingLink as jest.Mock).mockResolvedValue(updatedLink)

      await store.dispatch(
        updateBookingLink({
          publicId: mockBookingLink.publicId,
          request: {
            name: 'Updated Intro Call',
            durationMinutes: 45
          }
        })
      )

      const state = store.getState()
      expect(state.list).toHaveLength(2)
      const updated = state.list.find(
        link => link.publicId === mockBookingLink.publicId
      )
      expect(updated?.name).toBe('Updated Intro Call')
      expect(updated?.durationMinutes).toBe(45)
      expect(state.pending).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle partial update', async () => {
      const store = configureStore({
        reducer,
        preloadedState: {
          ...initialState,
          list: [mockBookingLink]
        }
      })

      const updatedLink: BookingLink = {
        ...mockBookingLink,
        active: false
      }

      ;(bookingDAO.updateBookingLink as jest.Mock).mockResolvedValue(undefined)
      ;(bookingDAO.getBookingLink as jest.Mock).mockResolvedValue(updatedLink)

      await store.dispatch(
        updateBookingLink({
          publicId: mockBookingLink.publicId,
          request: {
            active: false
          }
        })
      )

      const state = store.getState()
      expect(state.list[0].active).toBe(false)
      expect(state.list[0].name).toBe(mockBookingLink.name) // unchanged
    })

    it('should handle update error', async () => {
      const store = configureStore({
        reducer,
        preloadedState: {
          ...initialState,
          list: [mockBookingLink]
        }
      })

      ;(bookingDAO.updateBookingLink as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      )

      await store.dispatch(
        updateBookingLink({
          publicId: mockBookingLink.publicId,
          request: {
            name: 'New Name'
          }
        })
      )

      const state = store.getState()
      // Should not modify state on error
      expect(state.list[0].name).toBe(mockBookingLink.name)
      expect(state.pending).toBe(false)
      expect(state.error).toBe('Update failed')
    })

    it('should set pending state during update', async () => {
      const store = configureStore({
        reducer,
        preloadedState: {
          ...initialState,
          list: [mockBookingLink]
        }
      })

      let resolveGetBookingLink: (value: BookingLink) => void
      const getBookingLinkPromise = new Promise<BookingLink>(resolve => {
        resolveGetBookingLink = resolve
      })

      ;(bookingDAO.updateBookingLink as jest.Mock).mockResolvedValue(undefined)
      ;(bookingDAO.getBookingLink as jest.Mock).mockReturnValue(
        getBookingLinkPromise
      )

      const dispatchPromise = store.dispatch(
        updateBookingLink({
          publicId: mockBookingLink.publicId,
          request: { name: 'New Name' }
        })
      )

      // Check pending state immediately
      expect(store.getState().pending).toBe(true)

      resolveGetBookingLink!({ ...mockBookingLink, name: 'New Name' })
      await dispatchPromise

      expect(store.getState().pending).toBe(false)
    })
  })
})
