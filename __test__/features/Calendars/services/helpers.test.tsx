import { fetchOwnerData } from '@/features/Calendars/services/helpers'
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

    it('should fetch resource details and its creator when user is not found', async () => {
      const mockResource = { creator: 'creator-456' } as any
      const mockCreator = {
        firstname: 'Creator',
        lastname: 'User',
        emails: ['creator@example.com']
      } as any

      mockedFetchUserById.mockRejectedValueOnce({ response: { status: 404 } })
      mockedFetchResourceById.mockResolvedValueOnce(mockResource)
      mockedFetchUserById.mockResolvedValueOnce(mockCreator)

      const result = await fetchOwnerData('resource-123')

      expect(fetchUserById).toHaveBeenNthCalledWith(1, 'resource-123')
      expect(fetchResourceById).toHaveBeenCalledWith('resource-123')
      expect(fetchUserById).toHaveBeenNthCalledWith(2, 'creator-456')
      expect(result).toEqual({
        ...mockCreator,
        resource: true,
        administrators: undefined,
        resourceIcon: undefined
      })
    })

    it('should throw error when fetchUserById fails with non-404 error', async () => {
      const mockError = { response: { status: 500 } }
      mockedFetchUserById.mockRejectedValueOnce(mockError)

      await expect(fetchOwnerData('user-123')).rejects.toEqual(mockError)

      expect(fetchUserById).toHaveBeenCalledWith('user-123')
      expect(fetchResourceById).not.toHaveBeenCalled()
    })

    it('should throw error when fetchResourceById fails', async () => {
      const mockError = new Error('Resource not found')
      mockedFetchUserById.mockRejectedValueOnce({ response: { status: 404 } })
      mockedFetchResourceById.mockRejectedValueOnce(mockError)

      await expect(fetchOwnerData('resource-123')).rejects.toEqual(mockError)

      expect(fetchUserById).toHaveBeenCalledWith('resource-123')
      expect(fetchResourceById).toHaveBeenCalledWith('resource-123')
      expect(fetchUserById).toHaveBeenCalledTimes(1)
    })
  })
})
