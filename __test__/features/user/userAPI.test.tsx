import { clientConfig } from '@/features/User/oidcAuth'
import { fetchResourceById } from '@/features/User/ResourceDAO'
import {
  getOpenPaasUser,
  getUserDetails,
  updateUserConfigurations
} from '@/features/User/userAPI'
import {
  fetchCurrentUser,
  fetchUserById,
  patchConfigurations
} from '@/features/User/UserDao'
import { api } from '@/utils/apiUtils'

jest.mock('@/features/User/UserDao')
jest.mock('@/utils/apiUtils')

clientConfig.url = 'https://example.com'

const mockFetchCurrentUser = fetchCurrentUser as jest.MockedFunction<
  typeof fetchCurrentUser
>
const mockFetchUserById = fetchUserById as jest.MockedFunction<
  typeof fetchUserById
>
const mockFetchResourceById = api.get as jest.MockedFunction<typeof api.get>
const mockPatchConfigurations = patchConfigurations as jest.MockedFunction<
  typeof patchConfigurations
>

describe('getOpenPaasUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch and return user data', async () => {
    const mockUser = { id: '123', name: 'OpenPaas User' }
    mockFetchCurrentUser.mockResolvedValue(mockUser)

    const result = await getOpenPaasUser()

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    expect(result).toEqual(mockUser)
  })
})

describe('getUserDetails', () => {
  it('should fetch and return user details', async () => {
    const mockUser = {
      firstname: 'John',
      lastname: 'Doe',
      emails: ['john@test.com']
    } as any
    const userId = '123'
    mockFetchUserById.mockResolvedValue(mockUser)

    const result = await getUserDetails(userId)

    expect(fetchUserById).toHaveBeenCalledWith(userId)
    expect(result).toEqual(mockUser)
  })
})

describe('getResourceDetails', () => {
  it('should fetch and return resource details', async () => {
    const mockResource = { _id: 'res-123', name: 'Meeting Room A' } as any
    const resourceId = 'res-123'

    mockFetchResourceById.mockReturnValue({
      json: () => Promise.resolve(mockResource)
    })

    const result = await fetchResourceById(resourceId)

    expect(mockFetchResourceById).toHaveBeenCalledWith(
      `api/resources/${resourceId}`
    )
    expect(result).toEqual(mockResource)
  })
})

describe('updateUserConfigurations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call patchConfigurations with language update', async () => {
    mockPatchConfigurations.mockResolvedValue({ status: 204 } as any)

    await updateUserConfigurations({ language: 'vi' })

    expect(patchConfigurations).toHaveBeenCalledWith([
      {
        name: 'core',
        configurations: [{ name: 'language', value: 'vi' }]
      }
    ])
  })

  it('should call patchConfigurations with multiple updates', async () => {
    mockPatchConfigurations.mockResolvedValue({ status: 204 } as any)

    await updateUserConfigurations({
      language: 'fr',
      timezone: 'Europe/Paris'
    })

    expect(patchConfigurations).toHaveBeenCalledWith([
      {
        name: 'core',
        configurations: [
          { name: 'language', value: 'fr' },
          { name: 'datetime', value: { timeZone: 'Europe/Paris' } }
        ]
      }
    ])
  })

  it('should handle empty updates without calling patchConfigurations', async () => {
    const result = await updateUserConfigurations({})

    expect(patchConfigurations).not.toHaveBeenCalled()
    expect(result).toEqual({ status: 204 }) // comes from an early return
  })
})
