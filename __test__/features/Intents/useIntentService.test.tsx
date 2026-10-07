import { setupStore } from '@common/app/store'
import { getCozyURL } from '@common/utils/cozyUrl'
import { useIntentService } from '@common/features/Intents/hooks/useIntentService'
import { CozyStackError } from '@common/features/Intents/IntentsDao'
import * as TdriveDao from '@common/features/Tdrive/TdriveDao'
import { renderHook, waitFor } from '@testing-library/react'
import React, { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'

const mockCreateService = jest.fn()
const mockIntentsOptions = jest.fn()

jest.mock('cozy-interapp', () =>
  jest.fn().mockImplementation((options: unknown) => {
    mockIntentsOptions(options)
    return { createService: mockCreateService }
  })
)
jest.mock('@common/features/Tdrive/TdriveDao')
jest.mock('@common/utils/cozyUrl', () => ({
  getCozyURL: jest.fn(() => 'https://alice.twake.app')
}))

const service = {
  getData: jest.fn(() => ({ date: '2026-10-03' })),
  getIntent: jest.fn(() => ({
    _id: 'abc',
    attributes: {
      action: 'OPEN',
      type: 'io.cozy.calendar.events',
      client: 'https://mail.alice.twake.app'
    }
  })),
  terminate: jest.fn(),
  cancel: jest.fn(),
  throw: jest.fn(),
  notifyReadyToUse: jest.fn()
}

const signedInState = {
  user: {
    userData: { email: 'alice@example.com', workplaceFqdn: 'alice.twake.app' },
    organiserData: {},
    tokens: { id_token: 'id-token' }
  }
}

const renderService = (
  intentId: string | null,
  preloadedState: object = signedInState
): ReturnType<
  typeof renderHook<ReturnType<typeof useIntentService>, unknown>
> => {
  const store = setupStore(preloadedState)
  const wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <React.StrictMode>
      <Provider store={store}>{children}</Provider>
    </React.StrictMode>
  )
  return renderHook(() => useIntentService(intentId), { wrapper })
}

describe('useIntentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(TdriveDao.exchangeToken as jest.Mock).mockResolvedValue({
      access_token: 'cozy-token'
    })
    mockCreateService.mockResolvedValue(service)
    ;(getCozyURL as jest.Mock).mockReturnValue('https://alice.twake.app')
  })

  it('creates the intent service on the Cozy stack, once', async () => {
    const { result } = renderService('abc')

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(TdriveDao.exchangeToken).toHaveBeenCalledWith(
      'https://alice.twake.app',
      'id-token'
    )
    expect(mockIntentsOptions).toHaveBeenCalledWith({
      fetch: expect.any(Function)
    })
    expect(mockCreateService).toHaveBeenCalledTimes(1)
    expect(mockCreateService).toHaveBeenCalledWith('abc', window)
    expect(result.current).toEqual({
      status: 'ready',
      service,
      action: 'OPEN',
      type: 'io.cozy.calendar.events',
      data: { date: '2026-10-03' }
    })
  })

  it('waits for the user to be signed in', async () => {
    const { result } = renderService('abc', {
      user: { userData: null, organiserData: {}, tokens: null }
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(result.current).toEqual({ status: 'loading' })
    expect(TdriveDao.exchangeToken).not.toHaveBeenCalled()
  })

  it('reports a workplace it cannot find once signed in', async () => {
    ;(getCozyURL as jest.Mock).mockReturnValue(null)

    const { result } = renderService('abc')

    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'error',
        reason: 'tokenExchangeFailed'
      })
    )
    expect(TdriveDao.exchangeToken).not.toHaveBeenCalled()
  })

  it('keeps waiting without a workplace until signed in', async () => {
    ;(getCozyURL as jest.Mock).mockReturnValue(null)

    const { result } = renderService('abc', {
      user: { userData: null, organiserData: {}, tokens: null }
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('reports a failed token exchange', async () => {
    ;(TdriveDao.exchangeToken as jest.Mock).mockRejectedValue(new Error('down'))

    const { result } = renderService('abc')

    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'error',
        reason: 'tokenExchangeFailed'
      })
    )
  })

  it('reports an intent the app may not read', async () => {
    mockCreateService.mockRejectedValue(new CozyStackError(403, 'Forbidden'))

    const { result } = renderService('abc')

    await waitFor(() =>
      expect(result.current).toEqual({ status: 'error', reason: 'forbidden' })
    )
  })

  it('reports any other failure of the service', async () => {
    mockCreateService.mockRejectedValue(new Error('boom'))

    const { result } = renderService('abc')

    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'error',
        reason: 'serviceFailed'
      })
    )
  })

  it('reports a missing intent id', () => {
    const { result } = renderService(null)

    expect(result.current).toEqual({ status: 'error', reason: 'missingIntent' })
  })
})
