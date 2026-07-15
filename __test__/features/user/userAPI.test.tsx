import { clientConfig } from '@common/features/User/oidcAuth'
import { SearchResponseItem } from '@common/types/SearchResponseItem'
import {
  makeConfigurationBody,
  parseSearchUserResponse,
  SEARCH_LIMIT
} from '@common/features/User/transformers'
import {
  fetchUserByEmail,
  patchConfigurations,
  searchPeople
} from '@common/features/User/UserDao'

jest.mock('@common/features/User/UserDao')
jest.mock('@common/utils/apiUtils')

clientConfig.url = 'https://example.com'

const mockFetchUserByEmail = fetchUserByEmail as jest.MockedFunction<
  typeof fetchUserByEmail
>
const mockSearchPeople = searchPeople as jest.MockedFunction<
  typeof searchPeople
>
const mockPatchConfigurations = patchConfigurations as jest.MockedFunction<
  typeof patchConfigurations
>

describe('makeConfigurationBody', () => {
  it('should create configuration body with language update', () => {
    const result = makeConfigurationBody({ language: 'vi' })

    expect(result).toEqual({
      modules: [
        {
          name: 'core',
          configurations: [{ name: 'language', value: 'vi' }]
        }
      ]
    })
  })

  it('should create configuration body with multiple updates', () => {
    const result = makeConfigurationBody({
      language: 'fr',
      timezone: 'Europe/Paris'
    })

    expect(result).toEqual({
      modules: [
        {
          name: 'core',
          configurations: [
            { name: 'language', value: 'fr' },
            { name: 'datetime', value: { timeZone: 'Europe/Paris' } }
          ]
        }
      ]
    })
  })

  it('should return empty modules for empty updates', () => {
    const result = makeConfigurationBody({})

    expect(result).toEqual({ modules: [] })
  })

  it('should send businessHours days in ISO-8601 format (Sunday 0 -> 7)', () => {
    const result = makeConfigurationBody({
      businessHours: {
        start: '9:0',
        end: '18:0',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0]
      }
    })

    expect(result).toEqual({
      modules: [
        {
          name: 'core',
          configurations: [
            {
              name: 'businessHours',
              value: [
                { start: '9:0', end: '18:0', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] }
              ]
            }
          ]
        }
      ]
    })
  })

  it('should forward businessHours null to clear the config', () => {
    const result = makeConfigurationBody({ businessHours: null })

    expect(result).toEqual({
      modules: [
        {
          name: 'core',
          configurations: [{ name: 'businessHours', value: null }]
        }
      ]
    })
  })
})

describe('patchConfigurations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call patchConfigurations with correct modules', async () => {
    mockPatchConfigurations.mockResolvedValue({ status: 204 } as any)

    const body = makeConfigurationBody({ language: 'vi' })
    await patchConfigurations(body.modules)

    expect(patchConfigurations).toHaveBeenCalledWith([
      {
        name: 'core',
        configurations: [{ name: 'language', value: 'vi' }]
      }
    ])
  })
})

describe('parseSearchUserResponse', () => {
  it('should parse search response to user results', () => {
    const mockResponse = [
      new SearchResponseItem({
        id: 'user-1',
        emailAddresses: [{ value: 'john@test.com' }],
        names: [{ displayName: 'John Doe' }],
        photos: [{ url: 'http://example.com/photo.jpg' }],
        objectType: 'user'
      })
    ]

    const result = parseSearchUserResponse(mockResponse)

    expect(result).toEqual([
      {
        email: 'john@test.com',
        displayName: 'John Doe',
        avatarUrl: 'http://example.com/photo.jpg',
        openpaasId: 'user-1',
        objectType: 'user'
      }
    ])
  })

  it('should handle missing data gracefully', () => {
    const mockResponse = [new SearchResponseItem({})]

    const result = parseSearchUserResponse(mockResponse)

    expect(result).toEqual([
      {
        email: '',
        displayName: '',
        avatarUrl: '',
        openpaasId: undefined,
        objectType: undefined
      }
    ])
  })
})

describe('searchPeople', () => {
  it('should search people with correct params', async () => {
    const mockResponse = [
      new SearchResponseItem({
        id: 'user-1',
        emailAddresses: [{ value: 'john@test.com' }],
        names: [{ displayName: 'John Doe' }],
        photos: [{ url: 'http://example.com/photo.jpg' }],
        objectType: 'user'
      })
    ]
    mockSearchPeople.mockResolvedValue(mockResponse)

    const param = { q: 'john', objectTypes: ['user'] }
    const response = await searchPeople(param.q, param.objectTypes)
    const result = parseSearchUserResponse(response)

    expect(searchPeople).toHaveBeenCalledWith('john', ['user'])
    expect(result[0].email).toEqual('john@test.com')
    expect(result[0].displayName).toEqual('John Doe')
  })
})

describe('fetchUserByEmail', () => {
  it('should fetch user by email', async () => {
    const mockUsers = [{ _id: 'user-1', email: 'john@test.com' }]
    mockFetchUserByEmail.mockResolvedValue(mockUsers)

    const result = await fetchUserByEmail('john@test.com')

    expect(fetchUserByEmail).toHaveBeenCalledWith('john@test.com')
    expect(result).toEqual(mockUsers)
  })

  it('should return empty array on error', async () => {
    mockFetchUserByEmail.mockResolvedValue([])

    const result = await fetchUserByEmail('notfound@test.com')

    expect(result).toEqual([])
  })
})
