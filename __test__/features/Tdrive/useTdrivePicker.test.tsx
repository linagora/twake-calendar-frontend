import { renderHook, waitFor, act } from '@testing-library/react'
import {
  makeIntentFetch,
  useTdrivePicker
} from '@common/features/Tdrive/hooks/useTdrivePicker'
import type { Sdk } from '@linagora/twake-sdk'
import { Provider } from 'react-redux'
import { setupStore } from '@common/app/store'
import React, { PropsWithChildren } from 'react'

// Mock cozy-interapp
// Like cozy-interapp, create() returns the intent creation request promise
// and stop() is attached to the promise returned by start()
const mockStart = jest.fn()
const mockStop = jest.fn()
const withStart = (creation: Promise<unknown>): Promise<unknown> =>
  Object.assign(creation, {
    start: (...args: unknown[]) =>
      Object.assign(mockStart(...args), { stop: mockStop })
  })
const mockCreate = jest.fn()

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

const mockLogin = jest.fn()
const mockCreateSdk = jest.fn()

jest.mock('@linagora/twake-sdk', () => ({
  createSdk: (options: unknown): unknown => mockCreateSdk(options)
}))
jest.mock('@linagora/twake-utils', () => ({
  resolveUriTemplate: jest.fn((template: string) => template)
}))

describe('useTdrivePicker', () => {
  const createWrapper = (preloadedState = {}) => {
    const store = setupStore(preloadedState)
    return function Wrapper({ children }: PropsWithChildren) {
      return React.createElement(Provider, { store }, children)
    }
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
    window.TDRIVE_INTENT_URL = 'https://drive.example.com'
    // Like the SDK client, a successful login makes the client ready
    const sdk = { status: 'waiting', login: mockLogin }
    mockCreateSdk.mockReturnValue(sdk)
    mockLogin.mockImplementation(async () => {
      sdk.status = 'ready'
    })
    mockCreate.mockImplementation(() => withStart(Promise.resolve({})))
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
    const { result } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isOpen).toBe(false)
  })

  it('opens picker using cozy-interapp', async () => {
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

    expect(mockCreateSdk).toHaveBeenCalledWith({
      platformURL: 'https://drive.example.com'
    })
    expect(mockLogin).toHaveBeenCalledWith('user-id-token')

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
    window.TDRIVE_INTENT_URL = undefined

    const { result } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.openPicker()
    })

    expect(result.current.isOpen).toBe(false)
    expect(mockCreateSdk).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('does not open when idToken is missing', async () => {
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
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockLogin.mockRejectedValue(new Error('API Error'))

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
    expect(mockStop).toHaveBeenCalledTimes(1)
  })

  it('stops the started intent on unmount', async () => {
    mockStart.mockImplementation((_container, { onReadyToUse } = {}) => {
      onReadyToUse?.()
      return new Promise(() => {})
    })

    const { result, unmount } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
      { wrapper: createWrapper(defaultUserState) }
    )

    mountContainer(result)
    act(() => {
      void result.current.openPicker()
    })
    await waitFor(() => expect(mockStart).toHaveBeenCalled())

    unmount()

    expect(mockStop).toHaveBeenCalledTimes(1)
  })

  it('settles openPicker when the picker is closed', async () => {
    mockStart.mockImplementation((_container, { onReadyToUse } = {}) => {
      onReadyToUse?.()
      return new Promise(() => {})
    })

    const onFilesSelected = jest.fn()
    const { result } = renderHook(() => useTdrivePicker({ onFilesSelected }), {
      wrapper: createWrapper(defaultUserState)
    })

    mountContainer(result)
    let openPickerSettled = false
    act(() => {
      void result.current.openPicker().then(() => {
        openPickerSettled = true
      })
    })
    await waitFor(() => expect(mockStart).toHaveBeenCalled())

    act(() => {
      result.current.closePicker()
    })

    await waitFor(() => expect(openPickerSettled).toBe(true))
    expect(onFilesSelected).not.toHaveBeenCalled()
  })

  it('stops the intent once created when closed during its creation', async () => {
    let completeCreation!: (intent: unknown) => void
    mockCreate.mockImplementation(() =>
      withStart(
        new Promise(resolve => {
          completeCreation = resolve
        })
      )
    )
    mockStart.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
      { wrapper: createWrapper(defaultUserState) }
    )

    mountContainer(result)
    act(() => {
      void result.current.openPicker()
    })
    await waitFor(() => expect(mockStart).toHaveBeenCalled())

    act(() => {
      result.current.closePicker()
    })
    mockStop.mockClear()

    await act(async () => {
      completeCreation({})
    })

    expect(mockStop).toHaveBeenCalledTimes(1)
  })

  it('exchanges the id token only once across picker opens', async () => {
    const { result } = renderHook(
      () => useTdrivePicker({ onFilesSelected: jest.fn() }),
      { wrapper: createWrapper(defaultUserState) }
    )

    mountContainer(result)
    await act(async () => {
      await result.current.openPicker()
    })
    await act(async () => {
      await result.current.openPicker()
    })

    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(mockCreateSdk).toHaveBeenCalledTimes(1)
    expect(mockLogin).toHaveBeenCalledTimes(1)
  })
})

describe('makeIntentFetch', () => {
  it('sends the intent requests through the SDK client', async () => {
    const fetchJSON = jest.fn().mockResolvedValue({ data: { id: 'intent-1' } })
    const intentFetch = makeIntentFetch({ fetchJSON } as unknown as Sdk)

    const response = await intentFetch('POST', '/intents', {
      data: { type: 'io.cozy.intents' }
    })

    expect(response).toEqual({ data: { id: 'intent-1' } })
    expect(fetchJSON).toHaveBeenCalledWith(
      '/intents',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { type: 'io.cozy.intents' } })
      })
    )
  })

  it('sends no body without one', async () => {
    const fetchJSON = jest.fn().mockResolvedValue({})
    const intentFetch = makeIntentFetch({ fetchJSON } as unknown as Sdk)

    await intentFetch('GET', '/intents/intent-1')

    expect(fetchJSON).toHaveBeenCalledWith(
      '/intents/intent-1',
      expect.objectContaining({ method: 'GET', body: undefined })
    )
  })
})
