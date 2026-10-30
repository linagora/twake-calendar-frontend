import { setSelectedCalendars } from '@common/utils/storage/setSelectedCalendars'
import { useWebSocketConnection } from '@linagora/twake-websocket'
import { registerToCalendars } from '@common/websocket/operations/registerToCalendars'
import { unregisterToCalendars } from '@common/websocket/operations/unregisterToCalendars'
import { WebSocketGate } from '@calendar/common/src/websocket/WebSocketGate'
import { configureStore, Store } from '@reduxjs/toolkit'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { I18nContext } from 'twake-i18n'

jest.mock('@common/websocket/operations/registerToCalendars')
jest.mock('@common/websocket/operations/unregisterToCalendars')
jest.mock('@linagora/twake-websocket', () => {
  return {
    __esModule: true,

    useWebSocketConnection: jest.fn()
  }
})

function TestWrapper({ store }: { store: Store }) {
  return (
    <I18nContext.Provider
      value={{
        t: (key: string, vars?: Record<string, string>) => {
          if (key === 'locale') return 'en'
          if (vars) {
            const params = Object.entries(vars)
              .map(([k, v]) => `${k}=${v}`)
              .join(',')
            return `${key}(${params})`
          }
          return key
        },
        f: (date: Date) => date.toString(),
        lang: 'en'
      }}
    >
      <Provider store={store}>
        <WebSocketGate />
      </Provider>
    </I18nContext.Provider>
  )
}

describe('WebSocketGate', () => {
  let store: any
  let mockSocket: any

  const createMockStore = (
    userData: any = { id: '1' },
    tokens: any = { access: 'token' }
  ) => {
    return configureStore({
      reducer: {
        user: (state = { userData, tokens }) => state,
        calendars: (state = { list: {} }) => state
      }
    })
  }

  const createMockSocket = (readyState = WebSocket.OPEN) => ({
    readyState,
    close: jest.fn(),
    send: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    cleanup: jest.fn(),
    onmessage: null
  })

  const mockConnection = (socket: any = mockSocket) =>
    (useWebSocketConnection as jest.Mock).mockReturnValue({
      socketRef: { current: socket },
      isOpen: socket.readyState === WebSocket.OPEN,
      epoch: 0
    })

  beforeEach(() => {
    store = createMockStore()
    mockSocket = createMockSocket()
    localStorage.clear()
    window.WEBSOCKET_URL = 'ws://localhost/ws'
    ;(useWebSocketConnection as jest.Mock).mockReturnValue({
      socketRef: { current: null },
      isOpen: false,
      epoch: 0
    })
  })

  afterEach(() => {
    cleanup()
    jest.clearAllMocks()
    jest.clearAllTimers()
    localStorage.clear()
  })

  describe('Authentication', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.clearAllMocks()
      jest.resetModules()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })
    it('disables the connection when user is not authenticated', () => {
      render(<TestWrapper store={createMockStore(null, null)} />)
      expect(useWebSocketConnection).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      )
    })

    it('enables the connection when user is authenticated', () => {
      render(<TestWrapper store={store} />)
      expect(useWebSocketConnection).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true, url: 'ws://localhost/ws' })
      )
    })
  })

  describe('Calendar Registration', () => {
    it('should not register if socket is not open', async () => {
      localStorage.setItem(
        'selectedCalendars',
        JSON.stringify(['cal1', 'cal2'])
      )

      const connectingSocket = createMockSocket(WebSocket.CONNECTING)
      ;(useWebSocketConnection as jest.Mock).mockResolvedValue(connectingSocket)

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(useWebSocketConnection).toHaveBeenCalled()
      })

      expect(registerToCalendars).not.toHaveBeenCalled()
    })

    it('should register to calendars when socket opens and calendars are selected', async () => {
      localStorage.setItem(
        'selectedCalendars',
        JSON.stringify(['cal1', 'cal2'])
      )
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/cal1',
          '/calendars/cal2'
        ])
      })
    })

    it("registers a delegated calendar through the sharee's instance", async () => {
      store = configureStore({
        reducer: {
          user: (
            state = { userData: { id: '1' }, tokens: { access: 'token' } }
          ) => state,
          calendars: (
            state = {
              list: {
                'owner1/cal1': {
                  id: 'owner1/cal1',
                  link: '/calendars/sharee1/instance1',
                  delegated: true
                },
                'sharee1/own': {
                  id: 'sharee1/own',
                  link: '/calendars/sharee1/own'
                }
              }
            }
          ) => state
        }
      })
      localStorage.setItem(
        'selectedCalendars',
        JSON.stringify(['owner1/cal1', 'sharee1/own'])
      )
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/sharee1/instance1',
          '/calendars/sharee1/own'
        ])
      })
    })

    it('should register only new calendars when calendar list changes', async () => {
      localStorage.setItem('selectedCalendars', JSON.stringify(['cal1']))
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/cal1'
        ])
      })

      jest.clearAllMocks()

      await act(async () => {
        setSelectedCalendars(['cal1', 'cal2', 'cal3'])
      })

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/cal2',
          '/calendars/cal3'
        ])
      })
    })

    it('should unregister removed calendars when calendar list changes', async () => {
      localStorage.setItem(
        'selectedCalendars',
        JSON.stringify(['cal1', 'cal2', 'cal3'])
      )
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled()
      })

      jest.clearAllMocks()

      await act(async () => {
        setSelectedCalendars(['cal1'])
      })

      await waitFor(() => {
        expect(unregisterToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/cal2',
          '/calendars/cal3'
        ])
      })
    })

    it('should both register and unregister when calendar list partially changes', async () => {
      localStorage.setItem(
        'selectedCalendars',
        JSON.stringify(['cal1', 'cal2'])
      )
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled()
      })

      jest.clearAllMocks()

      await act(async () => {
        setSelectedCalendars(['cal1', 'cal3'])
      })

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/cal3'
        ])
        expect(unregisterToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/cal2'
        ])
      })
    })

    it('should handle registration errors and not update previous calendar list', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      localStorage.setItem('selectedCalendars', JSON.stringify(['cal1']))
      mockConnection()
      ;(registerToCalendars as jest.Mock).mockImplementation(() => {
        throw new Error('Registration failed')
      })

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to register calendar:',
          expect.any(Error)
        )
      })

      await waitFor(() => {
        expect(mockSocket.close).not.toHaveBeenCalled()
      })

      jest.clearAllMocks()
      ;(registerToCalendars as jest.Mock).mockImplementation(() => {})

      await act(async () => {
        setSelectedCalendars(['cal1', 'cal2'])
      })

      await waitFor(() => {
        // Should register both calendars since previous update failed and didn't update the ref
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/cal1',
          '/calendars/cal2'
        ])
      })

      consoleError.mockRestore()
    })

    it('should not attempt registration when no calendars are selected', async () => {
      localStorage.setItem('selectedCalendars', JSON.stringify([]))
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(useWebSocketConnection).toHaveBeenCalled()
      })

      expect(registerToCalendars).not.toHaveBeenCalled()
      expect(unregisterToCalendars).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid calendar changes correctly', async () => {
      localStorage.setItem('selectedCalendars', JSON.stringify(['cal1']))
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledTimes(1)
      })

      // Rapid changes
      await act(async () => {
        setSelectedCalendars(['cal1', 'cal2'])
        setSelectedCalendars(['cal1', 'cal2', 'cal3'])
      })

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled()
      })
    })

    it('should handle socket closed during calendar update', async () => {
      localStorage.setItem('selectedCalendars', JSON.stringify(['cal1']))
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled()
      })

      jest.clearAllMocks()

      await act(async () => {
        mockSocket.readyState = WebSocket.CLOSED
        setSelectedCalendars(['cal1', 'cal2'])
      })

      // Wait a bit to ensure the effect would have run if it was going to
      jest.useFakeTimers()
      jest.advanceTimersByTime(100)
      jest.useRealTimers()
      expect(registerToCalendars).not.toHaveBeenCalled()
    })

    it('should handle unregistration errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      localStorage.setItem(
        'selectedCalendars',
        JSON.stringify(['cal1', 'cal2'])
      )
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled()
      })

      jest.clearAllMocks()
      ;(unregisterToCalendars as jest.Mock).mockImplementation(() => {
        throw new Error('Unregistration failed')
      })

      await act(async () => {
        setSelectedCalendars(['cal1'])
      })

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to unregister calendar:',
          expect.any(Error)
        )
      })

      consoleError.mockRestore()
    })

    it('should handle socket that becomes open after initial connection', async () => {
      const closedSocket = createMockSocket(WebSocket.CONNECTING)
      localStorage.setItem('selectedCalendars', JSON.stringify(['cal1']))
      mockConnection(closedSocket)

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(useWebSocketConnection).toHaveBeenCalled()
      })

      // Socket is not open yet, should not register
      expect(registerToCalendars).not.toHaveBeenCalled()

      // Simulate socket becoming open
      await act(async () => {
        closedSocket.readyState = WebSocket.OPEN
        // Trigger a calendar change to re-run the effect
        setSelectedCalendars(['cal1', 'cal2'])
      })

      // Still should not register because isSocketOpen state is false
      // The component only sets isSocketOpen to true when socket.readyState is OPEN during connection
      expect(registerToCalendars).not.toHaveBeenCalled()
    })
  })
})
