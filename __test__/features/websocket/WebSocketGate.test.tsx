import { setSelectedCalendars } from '@common/utils/storage/setSelectedCalendars'
import { establishWebSocketConnection } from '@linagora/twake-websocket'
import { registerToCalendars } from '@common/websocket/operations/registerToCalendars'
import { unregisterToCalendars } from '@common/websocket/operations/unregisterToCalendars'
import { WebSocketGate } from '@common/websocket/WebSocketGate'
import { configureStore, Store } from '@reduxjs/toolkit'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { I18nContext } from 'twake-i18n'

jest.mock('@common/websocket/operations/registerToCalendars')
jest.mock('@common/websocket/operations/unregisterToCalendars')
jest.mock('@linagora/twake-websocket', () => {
  const actual = jest.requireActual('@linagora/twake-websocket')
  return {
    __esModule: true,
    ...actual,
    setupWebSocketPing: jest.fn(() => ({
      stop: jest.fn(),
      sendPing: jest.fn()
    })),
    establishWebSocketConnection: jest.fn()
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

  const mockConnection = (
    socket: any = mockSocket,
    onCapture?: (callbacks: any) => void
  ) =>
    (establishWebSocketConnection as jest.Mock).mockImplementation(
      async (_url, _api, callbacks, socketRef, setIsSocketOpen) => {
        onCapture?.(callbacks)
        socketRef.current = socket
        setIsSocketOpen(socket.readyState === WebSocket.OPEN)
      }
    )

  beforeEach(() => {
    store = createMockStore()
    mockSocket = createMockSocket()
    localStorage.clear()
    window.WEBSOCKET_URL = 'ws://localhost/ws'
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
    it('should not create connection when user is not authenticated', () => {
      const unauthStore = createMockStore(null, null)

      render(<TestWrapper store={unauthStore} />)

      expect(establishWebSocketConnection).not.toHaveBeenCalled()
    })

    it('should create connection when user is authenticated', async () => {
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })
    })

    it('should close existing socket when user logs out', async () => {
      mockConnection()
      const { rerender } = render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalled()
      })

      const unauthStore = createMockStore(null, null)
      rerender(<TestWrapper store={unauthStore} />)

      await waitFor(() => {
        expect(mockSocket.close).toHaveBeenCalled()
      })
    })
  })

  describe('Socket Connection Management', () => {
    it('should create connection with callbacks', async () => {
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledWith(
          expect.any(String),
          expect.anything(),
          expect.objectContaining({
            onMessage: expect.any(Function),
            onClose: expect.any(Function),
            onError: expect.any(Function)
          }),
          expect.anything(),
          expect.any(Function),
          expect.anything()
        )
      })
    })

    it('should handle socket close via callback', async () => {
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalled()
      })

      // Simulate close event
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close'))
      })

      // Verify that subsequent calendar changes don't try to register
      await act(async () => {
        setSelectedCalendars(['cal1'])
      })

      await waitFor(() => {
        expect(registerToCalendars).not.toHaveBeenCalled()
      })
    })

    it('should handle connection errors gracefully', async () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation()
      ;(establishWebSocketConnection as jest.Mock).mockRejectedValue(
        new Error('Connection failed')
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith(
          expect.stringContaining('WebSocket establishment failed'),
          expect.any(Error)
        )
      })

      consoleWarn.mockRestore()
    })

    it('should close socket on component unmount', async () => {
      mockConnection()
      const { unmount } = render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalled()
      })

      unmount()

      expect(mockSocket.close).toHaveBeenCalled()
    })
  })

  describe('Reconnection Logic', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.clearAllMocks()
      jest.resetModules()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })
    it('should trigger reconnection on unexpected close (code 1006)', async () => {
      jest.useFakeTimers()
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation()
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // Simulate unexpected close
      await act(async () => {
        onCloseCallback?.(
          new CloseEvent('close', { code: 1006, reason: 'Connection lost' })
        )
      })

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket closed unexpectedly (code: 1006')
      )

      // Advance timer to trigger reconnection
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(2)
      })

      consoleWarn.mockRestore()
      jest.useRealTimers()
    })

    it('should NOT reconnect on normal close (code 1000)', async () => {
      jest.useFakeTimers()
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // Simulate normal close
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1000 }))
      })

      // Advance timer
      await act(async () => {
        jest.advanceTimersByTime(5000)
      })

      // Should NOT reconnect
      expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('should NOT reconnect on going away (code 1001)', async () => {
      jest.useFakeTimers()
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // Simulate going away
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1001 }))
      })

      await act(async () => {
        jest.advanceTimersByTime(5000)
      })

      expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('should reset reconnection attempts counter on successful connection', async () => {
      jest.useFakeTimers()
      const consoleLog = jest.spyOn(console, 'info').mockImplementation()
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // First failure
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
        jest.advanceTimersByTime(1000)
      })

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('(attempt 1/10)')
      )

      // Success - should reset counter
      // Next failure should start from attempt 1 again
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
      })

      // Should schedule with initial delay (attempt 1)
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('(attempt 1/10)')
      )

      consoleLog.mockRestore()
      jest.useRealTimers()
    })

    it('should not reconnect if authentication is lost during reconnection timeout', async () => {
      jest.useFakeTimers()
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      const { rerender } = render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // Trigger reconnection
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
      })

      // Lose authentication before timeout fires
      const unauthStore = createMockStore(null, null)
      rerender(<TestWrapper store={unauthStore} />)

      // Advance timer
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })

      // Should NOT reconnect (still only 1 connection)
      expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('should clear reconnection timeout on component unmount', async () => {
      jest.useFakeTimers()
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      const { unmount } = render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // Trigger reconnection
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
      })

      // Unmount before timeout fires
      unmount()

      // Advance timer
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })

      // Should NOT reconnect after unmount
      expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('should re-sync calendars after reconnection', async () => {
      jest.useFakeTimers()
      localStorage.setItem(
        'selectedCalendars',
        JSON.stringify(['cal1', 'cal2'])
      )
      let onCloseCallback: Function | undefined
      mockConnection(mockSocket, callbacks => {
        onCloseCallback = callbacks.onClose
      })

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/cal1',
          '/calendars/cal2'
        ])
      })

      jest.clearAllMocks()

      // Close and reconnect
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
        jest.advanceTimersByTime(1000)
      })

      // Should re-register all calendars after reconnection
      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          '/calendars/cal1',
          '/calendars/cal2'
        ])
      })
      jest.useRealTimers()
    })
  })

  describe('Browser Online/Offline Events', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.clearAllMocks()
      jest.resetModules()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })
    it('should trigger immediate reconnection when browser goes online', async () => {
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // Close connection
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
      })

      // Trigger online event
      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      // Should trigger immediate reconnection (no delay)
      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(2)
      })
    })

    it('should pause reconnection attempts when browser goes offline', async () => {
      jest.useFakeTimers()
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // Close connection
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
      })

      // Go offline before reconnection fires
      await act(async () => {
        window.dispatchEvent(new Event('offline'))
      })

      // Advance timer - should NOT reconnect
      await act(async () => {
        jest.advanceTimersByTime(10000)
      })

      expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('should not reconnect when online event fires if already connected', async () => {
      mockConnection()
      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // Trigger online event while connected
      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      // Should NOT trigger new connection
      expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
    })

    it('should reset attempt counter when online event fires', async () => {
      jest.useFakeTimers()
      const consoleLog = jest.spyOn(console, 'info').mockImplementation()
      let onCloseCallback: Function | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      // Multiple failed attempts
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
        jest.advanceTimersByTime(1000)
      })

      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
        jest.advanceTimersByTime(2000)
      })

      // Go offline then online
      await act(async () => {
        window.dispatchEvent(new Event('offline'))
        window.dispatchEvent(new Event('online'))
      })

      // Next reconnection should start from attempt 1
      await act(async () => {
        onCloseCallback?.(new CloseEvent('close', { code: 1006 }))
      })

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('(attempt 1/10)')
      )

      consoleLog.mockRestore()
      jest.useRealTimers()
    })
  })

  describe('Calendar Registration', () => {
    it('should not register if socket is not open', async () => {
      localStorage.setItem(
        'selectedCalendars',
        JSON.stringify(['cal1', 'cal2'])
      )

      const connectingSocket = createMockSocket(WebSocket.CONNECTING)
      ;(establishWebSocketConnection as jest.Mock).mockResolvedValue(
        connectingSocket
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalled()
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
                  link: '/calendars/sharee1/instance1.json',
                  delegated: true
                },
                'sharee1/own': {
                  id: 'sharee1/own',
                  link: '/calendars/sharee1/own.json'
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
        expect(establishWebSocketConnection).toHaveBeenCalled()
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
        expect(establishWebSocketConnection).toHaveBeenCalled()
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

  describe('Ping/Pong Integration', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should trigger reconnection when ping detects dead connection (via socket close)', async () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation()
      let onCloseCallback: ((event: CloseEvent) => void) | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })
      ;(establishWebSocketConnection as jest.Mock).mockClear()

      // In the real implementation, when ping detects dead connection,
      // it calls socket.close() which triggers the onClose callback
      // This simulates that flow
      await act(async () => {
        if (onCloseCallback) {
          onCloseCallback(new CloseEvent('close', { code: 1006 }))
        }
      })

      // Should schedule reconnection
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket closed unexpectedly')
      )

      // Advance to trigger reconnection
      await act(async () => {
        jest.advanceTimersByTime(1500)
      })

      // Should reconnect
      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
      })

      consoleWarn.mockRestore()
    })

    it('should stop ping monitoring when socket closes normally', async () => {
      let onCloseCallback: ((event: CloseEvent) => void) | undefined
      ;(establishWebSocketConnection as jest.Mock).mockImplementation(
        (_url, _api, callbacks) => {
          onCloseCallback = callbacks.onClose
          return Promise.resolve(mockSocket)
        }
      )

      render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalled()
      })

      // Normal close (code 1000) - like logout or page navigation
      await act(async () => {
        if (onCloseCallback) {
          onCloseCallback(new CloseEvent('close', { code: 1000 }))
        }
      })

      // Should not attempt reconnection
      await act(async () => {
        jest.advanceTimersByTime(5000)
      })

      expect(establishWebSocketConnection).toHaveBeenCalledTimes(1)
    })

    it('should cleanup ping monitoring on component unmount', async () => {
      mockConnection()
      const { unmount } = render(<TestWrapper store={store} />)

      await waitFor(() => {
        expect(establishWebSocketConnection).toHaveBeenCalled()
      })

      // Unmount should cleanup
      unmount()

      expect(mockSocket.close).toHaveBeenCalled()
    })
  })
})
