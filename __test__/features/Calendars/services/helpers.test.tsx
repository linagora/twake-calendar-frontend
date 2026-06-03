import {
  fetchOwnerData,
  fetchOwnerOfResource,
  extractResourceOwnerIds
} from '@/features/Calendars/services/helpers'
import { fetchUserById } from '@/features/User/UserDao'
import { fetchResourceById } from '@/features/User/ResourceDAO'

jest.mock('@/features/User/UserDao')
jest.mock('@/features/User/ResourceDAO')

const mockedFetchUserById = fetchUserById as jest.MockedFunction<
  typeof fetchUserById
>
const mockedFetchResourceById = fetchResourceById as jest.MockedFunction<
  typeof fetchResourceById
>

describe('helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchOwnerData', () => {
    it('should return user details successfully', async () => {
      const mockUser = {
        firstname: 'John',
        lastname: 'Doe',
        emails: ['john@example.com']
      } as any
      mockedFetchUserById.mockResolvedValueOnce(mockUser)

      const result = await fetchOwnerData('user-123')

      expect(fetchUserById).toHaveBeenCalledWith('user-123')
      expect(fetchResourceById).not.toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })

    it('should throw error when fetchUserById fails with non-404 error', async () => {
      const mockError = { response: { status: 500 } }
      mockedFetchUserById.mockRejectedValueOnce(mockError)

      await expect(fetchOwnerData('user-123')).rejects.toEqual(mockError)

      expect(fetchUserById).toHaveBeenCalledWith('user-123')
      expect(fetchResourceById).not.toHaveBeenCalled()
    })

    it('should throw error when fetchUserById fails with 404 error', async () => {
      const mockError = { response: { status: 404 } }
      mockedFetchUserById.mockRejectedValueOnce(mockError)

      await expect(fetchOwnerData('user-123')).rejects.toEqual(mockError)

      expect(fetchUserById).toHaveBeenCalledWith('user-123')
      expect(fetchResourceById).not.toHaveBeenCalled()
    })
  })

  describe('fetchOwnerOfResource', () => {
    it('should fetch resource details and its creator successfully', async () => {
      const mockResource = { creator: 'creator-456' } as any
      const mockCreator = {
        firstname: 'Creator',
        lastname: 'User',
        emails: ['creator@example.com']
      } as any

      mockedFetchResourceById.mockResolvedValueOnce(mockResource)
      mockedFetchUserById.mockResolvedValueOnce(mockCreator)

      const result = await fetchOwnerOfResource('resource-123')

      expect(fetchResourceById).toHaveBeenCalledWith('resource-123')
      expect(fetchUserById).toHaveBeenCalledWith('creator-456')
      expect(result).toEqual({
        ...mockCreator,
        administrators: undefined,
        resourceIcon: undefined
      })
    })

    it('should throw error when fetchResourceById fails', async () => {
      const mockError = new Error('Resource not found')
      mockedFetchResourceById.mockRejectedValueOnce(mockError)

      await expect(fetchOwnerOfResource('resource-123')).rejects.toEqual(
        mockError
      )

      expect(fetchResourceById).toHaveBeenCalledWith('resource-123')
      expect(fetchUserById).not.toHaveBeenCalled()
    })
  })

  describe('extractResourceOwnerIds', () => {
    it('should return resource owner IDs from cal.invite', () => {
      const mockCalendars = [
        {
          cal: {
            invite: [
              { href: 'principals/resources/res1', access: 1 },
              { href: 'principals/users/user1', access: 2 }
            ]
          },
          ownerId: 'owner-res1'
        },
        {
          cal: {
            invite: [{ href: 'principals/users/user2', access: 1 }]
          },
          ownerId: 'owner-user2'
        }
      ] as any

      const result = extractResourceOwnerIds(mockCalendars)
      expect(result).toEqual(new Set(['owner-res1']))
    })

    it('should return resource owner IDs from calendarserver:source invite', () => {
      const mockCalendars = [
        {
          cal: {
            'calendarserver:source': {
              invite: [{ href: 'principals/resources/res2', access: 1 }]
            }
          },
          ownerId: 'owner-res2'
        }
      ] as any

      const result = extractResourceOwnerIds(mockCalendars)
      expect(result).toEqual(new Set(['owner-res2']))
    })

    it('should return empty set if no resource owner IDs are found', () => {
      const mockCalendars = [
        {
          cal: {},
          ownerId: 'owner-none'
        }
      ] as any

      const result = extractResourceOwnerIds(mockCalendars)
      expect(result).toEqual(new Set())
    })
  })
})
