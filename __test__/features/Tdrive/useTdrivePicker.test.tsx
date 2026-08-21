import { renderHook, waitFor, act } from '@testing-library/react'
import { useTdrivePicker } from '@common/features/Tdrive/hooks/useTdrivePicker'
import * as TdriveDao from '@common/features/Tdrive/TdriveDao'
import * as tdriveUrlUtils from '@common/utils/tdriveUrlUtils'
import { Provider } from 'react-redux'
import { setupStore } from '@common/app/store'
import React, { PropsWithChildren } from 'react'

// Mock cozy-interapp
const mockStart = jest.fn()
const mockCreate = jest.fn().mockReturnValue({
  start: mockStart
})

jest.mock('cozy-interapp', () => {
  return jest.fn().mockImplementation(() => ({
    create: mockCreate
  }))
})

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

jest.mock('@common/features/Tdrive/TdriveDao')
jest.mock('@common/utils/tdriveUrlUtils')

describe('useTdrivePicker', () => {
  const mockExchangeToken = jest.spyOn(TdriveDao, 'exchangeToken')
  const mockResolveTdriveUrl = jest.spyOn(tdriveUrlUtils, 'resolveTdriveUrl')

  const createWrapper = (preloadedState = {}) => {
    const store = setupStore(preloadedState)
    return function Wrapper({ children }: PropsWithChildren) {
      return React.createElement(Provider, { store }, children)
    }
  }

  const defaultTokenResponse = {
    token_type: 'bearer',
    scope: 'io.cozy.files',
    access_token: 'test-access-token',
    refresh_token: 'refresh-token',
    client_id: 'client-123',
    client_secret: 'secret',
    registration_access_token: 'reg-token'
  }

  const defaultUserState = {
    user: {
      userData: { email: 'alice@example.com', workplaceFqdn: 'example.com' },
      organiserData: {},
      tokens: { id_token: 'user-id-token' }
    }
  }

  const mountContainer = (result: {
    current: ReturnType<typeof useTdrivePicker>
  }): void => {
    Object.defineProperty(result.current.containerRef, 'current', {
      value: document.createElement('div'),
      writable: true,
      configurable: true
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Default: start() calls onReadyToUse then resolves with a file
    mockStart.mockImplementation((_container, { onReadyToUse } = {}) => {
      onReadyToUse?.()
      return Promise.resolve({
        id: 'file-1',
        name: 'document.pdf',
        url: 'https://drive.example.com/doc'
      })
    })
  })

  it('initializes with closed state', () => {
    mockResolveTdriveUrl.mockReturnValue('https://drive.example.com')

    const { result } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isOpen).toBe(false)
  })

  it('opens picker using cozy-interapp', async () => {
    mockResolveTdriveUrl.mockReturnValue('https://drive.example.com')
    mockExchangeToken.mockResolvedValue(defaultTokenResponse)

    // Don't resolve start() yet so we can assert isOpen while it's open
    let resolveStart!: (value: unknown) => void
    mockStart.mockImplementation((_container, { onReadyToUse } = {}) => {
      onReadyToUse?.()
      return new Promise(resolve => {
        resolveStart = resolve
      })
    })

    const { result } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
      { wrapper: createWrapper(defaultUserState) }
    )

    // Don't await — let it hang while the picker is open
    mountContainer(result)
    act(() => {
      void result.current.openPicker()
    })

    await waitFor(() => expect(result.current.isOpen).toBe(true))

    expect(mockExchangeToken).toHaveBeenCalledWith(
      'https://drive.example.com',
      'user-id-token'
    )

    expect(mockCreate).toHaveBeenCalledWith(
      'PICK',
      'io.cozy.files',
      {
        theme: { type: 'light' },
        multiple: true,
        sharingLink: { label: 'tdrive.addAsAttachment' },
        downloadLink: null,
        displayCloseButton: true
      },
      ['GET']
    )

    expect(mockStart).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        onReadyToUse: expect.any(Function)
      })
    )

    // Resolve and let it close
    act(() =>
      resolveStart({
        id: 'file-1',
        name: 'doc.pdf',
        url: 'https://drive.example.com/doc'
      })
    )
    await waitFor(() => expect(result.current.isOpen).toBe(false))
  })

  it('does not open when TDRIVE_URL is not configured', async () => {
    mockResolveTdriveUrl.mockReturnValue(null)

    const { result } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.openPicker()
    })

    expect(result.current.isOpen).toBe(false)
    expect(mockExchangeToken).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('does not open when idToken is missing', async () => {
    mockResolveTdriveUrl.mockReturnValue('https://drive.example.com')

    const { result } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
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
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
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

    mountContainer(result)
    await act(async () => {
      await result.current.openPicker()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.openPickerError).toBe('tdrivePickerFailed')
  })

  it('calls onFilesSelected with file from intent result', async () => {
    mockResolveTdriveUrl.mockReturnValue('https://drive.example.com')
    mockExchangeToken.mockResolvedValue(defaultTokenResponse)

    const onFilesSelected = jest.fn()

    mockStart.mockImplementation((_container, { onReadyToUse } = {}) => {
      onReadyToUse?.()
      return Promise.resolve({
        id: 'file-123',
        name: 'test-document.pdf',
        url: 'https://drive.example.com/file-123',
        sharingLink: 'https://drive.example.com/file-123'
      })
    })

    const { result } = renderHook(() => useTdrivePicker({ onFilesSelected }), {
      wrapper: createWrapper({
        user: {
          userData: { email: 'alice@example.com' },
          organiserData: {},
          tokens: { id_token: 'token' }
        }
      })
    })

    mountContainer(result)
    await act(async () => {
      await result.current.openPicker()
    })

    expect(onFilesSelected).toHaveBeenCalledWith([
      {
        id: 'file-123',
        name: 'test-document.pdf',
        url: 'https://drive.example.com/file-123',
        type: 'sharingLink',
        mimeType: null
      }
    ])

    expect(result.current.isOpen).toBe(false)
  })

  it('closes picker and resets state', async () => {
    mockResolveTdriveUrl.mockReturnValue('https://drive.example.com')
    mockExchangeToken.mockResolvedValue(defaultTokenResponse)

    // start() calls onReadyToUse but never resolves — simulates picker staying open
    mockStart.mockImplementation((_container, { onReadyToUse } = {}) => {
      onReadyToUse?.()
      return new Promise(() => {})
    })

    const { result } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
      { wrapper: createWrapper(defaultUserState) }
    )

    mountContainer(result)
    act(() => {
      void result.current.openPicker()
    })
    await waitFor(() => expect(result.current.isOpen).toBe(true))

    act(() => {
      result.current.closePicker()
    })
    expect(result.current.isOpen).toBe(false)
  })
})
