import {
  fetchOwnerData,
  fetchOwnerOfResource,
  getOwnerOrResourceData
} from '@common/features/Calendars/services/helpers'
import { fetchEntityById } from '@common/features/User/EntityDAO'
import { fetchResourceById } from '@common/features/User/ResourceDAO'
import { fetchUserById } from '@common/features/User/UserDao'

jest.mock('@common/features/User/UserDao')
jest.mock('@common/features/User/ResourceDAO')
jest.mock('@common/features/User/EntityDAO')

const mockedFetchUserById = fetchUserById
const mockedFetchResourceById = fetchResourceById
const mockedFetchEntityById = fetchEntityById

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

  describe('getOwnerOrResourceData', () => {
    it('should return user data when fetchEntityById returns user root key', async () => {
      const mockUser = {
        id: 'u-1',
        firstname: 'Jane',
        emails: ['jane@test.com']
      } as any
      mockedFetchEntityById.mockResolvedValueOnce({ user: mockUser })

      const result = await getOwnerOrResourceData('u-1')
      expect(result).toEqual(mockUser)
    })

    it('should return resource data when fetchEntityById returns resource root key', async () => {
      const mockResource = {
        _id: 'r-1',
        name: 'Conference Room',
        creator: 'u-creator',
        administrators: [
          {
            _id: 'admin-1',
            id: 'admin-1',
            objectType: 'user',
            access: 5
          }
        ]
      } as any
      const mockCreator = {
        id: 'u-creator',
        firstname: 'Admin',
        emails: ['admin@test.com']
      } as any

      mockedFetchEntityById.mockResolvedValueOnce({ resource: mockResource })
      mockedFetchUserById.mockResolvedValueOnce(mockCreator)

      const result = await getOwnerOrResourceData('r-1')
      expect(result.resource).toBe(true)
      expect(result.id).toBe('u-creator')
      expect(result.administrators).toEqual(mockResource.administrators)
    })

    it('should return team calendar owner data when fetchEntityById returns teamCalendar root key', async () => {
      const mockTeamCalendar = {
        id: 't-1',
        displayName: 'Dev Team Calendar'
      } as any

      mockedFetchEntityById.mockResolvedValueOnce({
        teamCalendar: mockTeamCalendar
      })

      const result = await getOwnerOrResourceData('t-1')
      expect(result.teamCalendar).toBe(true)
      expect(result.id).toBe('t-1')
      expect(result.firstname).toBe('Dev Team Calendar')
    })
  })
})
