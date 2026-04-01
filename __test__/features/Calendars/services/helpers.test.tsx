import { fetchOwnerData } from '@/features/Calendars/services/helpers'
import { getResourceDetails, getUserDetails } from '@/features/User/userAPI'

jest.mock('@/features/User/userAPI')

const mockedGetUserDetails = getUserDetails as jest.Mock
const mockedGetResourceDetails = getResourceDetails as jest.Mock

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
      }
      mockedGetUserDetails.mockResolvedValueOnce(mockUser)

      const result = await fetchOwnerData('user-123')

      expect(mockedGetUserDetails).toHaveBeenCalledWith('user-123')
      expect(mockedGetResourceDetails).not.toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })

    it('should fetch resource details and its creator when user is not found', async () => {
      const mockResource = { creator: 'creator-456' }
      const mockCreator = {
        firstname: 'Creator',
        lastname: 'User',
        emails: ['creator@example.com']
      }

      // Mock getUserDetails to fail with 404 for the initial call
      mockedGetUserDetails.mockRejectedValueOnce({
        response: { status: 404 }
      })

      // Mock getResourceDetails to succeed and return a creator ID
      mockedGetResourceDetails.mockResolvedValueOnce(mockResource)

      // Mock getUserDetails to succeed when called for the creator
      mockedGetUserDetails.mockResolvedValueOnce(mockCreator)

      const result = await fetchOwnerData('resource-123')

      expect(mockedGetUserDetails).toHaveBeenNthCalledWith(1, 'resource-123')
      expect(mockedGetResourceDetails).toHaveBeenCalledWith('resource-123')
      expect(mockedGetUserDetails).toHaveBeenNthCalledWith(2, 'creator-456')
      expect(result).toEqual({
        ...mockCreator,
        resource: true,
        administrators: undefined,
        resourceIcon: undefined
      })
    })

    it('should throw error when getUserDetails fails with non-404 error', async () => {
      const mockError = { response: { status: 500 } }
      mockedGetUserDetails.mockRejectedValueOnce(mockError)

      await expect(fetchOwnerData('user-123')).rejects.toEqual(mockError)

      expect(mockedGetUserDetails).toHaveBeenCalledWith('user-123')
      expect(mockedGetResourceDetails).not.toHaveBeenCalled()
    })

    it('should throw error when getResourceDetails fails', async () => {
      const mockError = new Error('Resource not found')

      // Mock getUserDetails to fail with 404 for the initial call
      mockedGetUserDetails.mockRejectedValueOnce({
        response: { status: 404 }
      })

      // Mock getResourceDetails to fail
      mockedGetResourceDetails.mockRejectedValueOnce(mockError)

      await expect(fetchOwnerData('resource-123')).rejects.toEqual(mockError)

      expect(mockedGetUserDetails).toHaveBeenCalledWith('resource-123')
      expect(mockedGetResourceDetails).toHaveBeenCalledWith('resource-123')
      expect(mockedGetUserDetails).toHaveBeenCalledTimes(1) // Only called once
    })
  })
})
