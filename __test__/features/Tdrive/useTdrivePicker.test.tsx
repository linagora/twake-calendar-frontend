import { renderHook, waitFor, act } from '@testing-library/react'
import { useTdrivePicker } from '@common/features/Tdrive/hooks/useTdrivePicker'
import * as TdriveDao from '@common/features/Tdrive/TdriveDao'
import * as tdriveUrlUtils from '@common/utils/tdriveUrlUtils'
import { Provider } from 'react-redux'
import { setupStore } from '@common/app/store'
import React, { PropsWithChildren } from 'react'

jest.mock('@common/features/Tdrive/TdriveDao')
jest.mock('@common/utils/tdriveUrlUtils')

describe('useTdrivePicker', () => {
  const mockExchangeToken = jest.spyOn(TdriveDao, 'exchangeToken')
  const mockCreateIntent = jest.spyOn(TdriveDao, 'createIntent')
  const mockResolveTdriveUrl = jest.spyOn(tdriveUrlUtils, 'resolveTdriveUrl')

  const createWrapper = (preloadedState = {}) => {
    const store = setupStore(preloadedState)
    return function Wrapper({ children }: PropsWithChildren) {
      return React.createElement(Provider, { store }, children)
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with closed state', () => {
    const { result } = renderHook(
      () => useTdrivePicker({ onFileSelected: jest.fn() }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isOpen).toBe(false)
    expect(result.current.iframeUrl).toBeNull()
  })

  it('opens picker after successful token exchange and intent creation', async () => {
    mockResolveTdriveUrl.mockReturnValue('https://drive.example.com')
    mockExchangeToken.mockResolvedValue({
      token_type: 'bearer',
      scope: 'io.cozy.files',
      access_token: 'test-access-token',
      refresh_token: 'refresh-token',
      client_id: 'client-123',
      client_secret: 'secret',
      registration_access_token: 'reg-token'
    })
    mockCreateIntent.mockResolvedValue({
      data: {
        type: 'io.cozy.intents',
        id: 'intent-123',
        attributes: {
          action: 'PICK',
          type: 'io.cozy.files',
          permissions: ['GET'],
          client: 'client-123',
          services: [
            {
              slug: 'drive',
              href: 'https://drive.example.com/intents?intent=intent-123'
            }
          ],
          availableApps: null
        },
        meta: { rev: '1' },
        links: {
          self: '/intents/intent-123',
          permissions: '/permissions/123'
        }
      }
    })

    const { result } = renderHook(
      () => useTdrivePicker({ onFileSelected: jest.fn() }),
      {
        wrapper: createWrapper({
          user: {
            userData: {
              email: 'alice@example.com',
              workplaceFqdn: 'example.com'
            },
            organiserData: {},
            tokens: { id_token: 'user-id-token' }
          }
        })
      }
    )

    await act(async () => {
      await result.current.openPicker()
    })

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true)
      expect(result.current.iframeUrl).toBe(
        'https://drive.example.com/intents?intent=intent-123'
      )
    })

    expect(mockExchangeToken).toHaveBeenCalledWith(
      'https://drive.example.com',
      'user-id-token'
    )
  })

  it('does not open when TDRIVE_URL is not configured', async () => {
    mockResolveTdriveUrl.mockReturnValue(null)

    const { result } = renderHook(
      () => useTdrivePicker({ onFileSelected: jest.fn() }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.openPicker()
    })

    expect(result.current.isOpen).toBe(false)
    expect(mockExchangeToken).not.toHaveBeenCalled()
  })

  it('does not open when idToken is missing', async () => {
    mockResolveTdriveUrl.mockReturnValue('https://drive.example.com')

    const { result } = renderHook(
      () => useTdrivePicker({ onFileSelected: jest.fn() }),
      {
        wrapper: createWrapper({
          user: {
            userData: { email: 'alice@example.com' },
            organiserData: {},
            tokens: {}
          }
        })
      }
    )

    await act(async () => {
      await result.current.openPicker()
    })

    expect(result.current.isOpen).toBe(false)
    expect(mockExchangeToken).not.toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    mockResolveTdriveUrl.mockReturnValue('https://drive.example.com')
    mockExchangeToken.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(
      () => useTdrivePicker({ onFileSelected: jest.fn() }),
      {
        wrapper: createWrapper({
          user: {
            userData: { email: 'alice@example.com' },
            organiserData: {},
            tokens: { id_token: 'token' }
          }
        })
      }
    )

    await act(async () => {
      await result.current.openPicker()
    })

    expect(result.current.isOpen).toBe(false)
  })

  it('closes picker and resets state', async () => {
    mockResolveTdriveUrl.mockReturnValue('https://drive.example.com')
    mockExchangeToken.mockResolvedValue({
      token_type: 'bearer',
      scope: 'io.cozy.files',
      access_token: 'test-access-token',
      refresh_token: 'refresh-token',
      client_id: 'client-123',
      client_secret: 'secret',
      registration_access_token: 'reg-token'
    })
    mockCreateIntent.mockResolvedValue({
      data: {
        type: 'io.cozy.intents',
        id: 'intent-123',
        attributes: {
          action: 'PICK',
          type: 'io.cozy.files',
          permissions: ['GET'],
          client: 'client-123',
          services: [
            {
              slug: 'drive',
              href: 'https://drive.example.com/intents?intent=intent-123'
            }
          ],
          availableApps: null
        },
        meta: { rev: '1' },
        links: {
          self: '/intents/intent-123',
          permissions: '/permissions/123'
        }
      }
    })

    const { result } = renderHook(
      () => useTdrivePicker({ onFileSelected: jest.fn() }),
      {
        wrapper: createWrapper({
          user: {
            userData: { email: 'alice@example.com' },
            organiserData: {},
            tokens: { id_token: 'token' }
          }
        })
      }
    )

    await act(async () => {
      await result.current.openPicker()
    })
    await waitFor(() => expect(result.current.isOpen).toBe(true))

    act(() => {
      result.current.closePicker()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.iframeUrl).toBeNull()
  })

  it('calls onFileSelected and closes on file selection', () => {
    const onFileSelected = jest.fn()

    const { result } = renderHook(() => useTdrivePicker({ onFileSelected }), {
      wrapper: createWrapper()
    })

    const file = {
      id: 'file-1',
      name: 'document.pdf',
      url: 'https://drive.example.com/file-1',
      type: 'sharingLink' as const
    }

    act(() => {
      result.current.handleFileSelected(file)
    })

    expect(onFileSelected).toHaveBeenCalledWith(file)
  })
})
