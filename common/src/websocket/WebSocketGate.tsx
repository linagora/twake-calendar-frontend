import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { AppDispatch } from '@common/app/store'
import { Calendar } from '@common/types/CalendarTypes'
import { useSelectedCalendars } from '@common/utils/storage/useSelectedCalendars'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import type { WebSocketWithCleanup } from './connection'
import { DebouncedFunc } from 'lodash'
import { closeWebSocketConnection } from './connection/lifecycle/closeWebSocketConnection'
import { establishWebSocketConnection } from './connection/lifecycle/establishWebSocketConnection'
import {
  setupWebSocketPing,
  type PingCleanup
} from './connection/lifecycle/pingWebSocket'
import { useWebSocketReconnect } from './connection/lifecycle/useWebSocketReconnect'
import {
  registerWebSocketState,
  setWebSocketConnecting
} from './connection/webSocketState'
import { updateCalendars } from './messaging/updateCalendars'
import { syncCalendarRegistrations } from './operations'
import { WebSocketStatusSnackbar } from './WebSocketStatusSnackbar'

export function WebSocketGate(): JSX.Element | null {
  const socketRef = useRef<WebSocketWithCleanup | null>(null)
  const previousCalendarListRef = useRef<string[]>([])
  const previousTempCalendarListRef = useRef<string[]>([])
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  const pingCleanupRef = useRef<PingCleanup | null>(null)

  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didConnectTimeoutRef = useRef(false)
  const CONNECT_TIMEOUT_MS = 10_000

  const hadSocketBeforeRef = useRef(false)
  const justReconnectedRef = useRef(false)
  const [websocketStatus, setWebSocketStatus] = useState('')
  const [websocketStatusSerity, setWebSocketStatusSerity] = useState<
    'success' | 'info' | 'warning' | 'error' | undefined
  >()

  const { t } = useI18n()

  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(state =>
    Boolean(state.user.userData && state.user.tokens)
  )
  const isAuthenticatedRef = useRef(isAuthenticated)

  const [isSocketOpen, setIsSocketOpen] = useState(false)
  const isPending = useAppSelector(state => state.calendars.pending)
  const [shouldConnect, setShouldConnect] = useState(false)

  const calendarList = useSelectedCalendars()
  const tempCalendarList = Object.keys(
    useAppSelector(state => state?.calendars?.templist) ?? {}
  )

  const calendarsToRefreshRef = useRef<
    Map<string, { calendar: Calendar; type?: 'temp' }>
  >(new Map())
  const calendarsToHideRef = useRef<Set<string>>(new Set())
  const shouldRefreshCalendarListRef = useRef<boolean>(false)
  const shouldRefreshBookingLinksRef = useRef<boolean>(false)
  const debouncedUpdateFnsRef = useRef<
    Map<string, DebouncedFunc<(dispatch: AppDispatch) => void>>
  >(new Map())
  const debouncedListUpdateFnRef = useRef<
    DebouncedFunc<(dispatch: AppDispatch) => void> | undefined
  >(undefined)
  const debouncedBookingLinksUpdateFnRef = useRef<
    DebouncedFunc<(dispatch: AppDispatch) => void> | undefined
  >(undefined)
  const currentDebouncePeriodRef = useRef<number | undefined>()
  const delayedRefreshTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map())

  const onMessage = useCallback(
    (message: unknown) => {
      const accumulators = {
        calendarsToRefresh: calendarsToRefreshRef.current,
        calendarsToHide: calendarsToHideRef.current,
        shouldRefreshCalendarListRef,
        shouldRefreshBookingLinksRef,
        debouncedUpdateFns: debouncedUpdateFnsRef.current,
        debouncedListUpdateFn: debouncedListUpdateFnRef.current,
        debouncedBookingLinksUpdateFn: debouncedBookingLinksUpdateFnRef.current,
        currentDebouncePeriod: currentDebouncePeriodRef.current,
        delayedRefreshTimers: delayedRefreshTimersRef.current
      }
      updateCalendars(message, dispatch, accumulators)
      // Persist any mutations back to refs
      debouncedListUpdateFnRef.current = accumulators.debouncedListUpdateFn
      debouncedBookingLinksUpdateFnRef.current =
        accumulators.debouncedBookingLinksUpdateFn
      currentDebouncePeriodRef.current = accumulators.currentDebouncePeriod
    },
    [dispatch]
  )

  const { scheduleReconnect, clearReconnectTimeout } = useWebSocketReconnect(
    reconnectTimeoutRef,
    isAuthenticatedRef,
    reconnectAttemptsRef,
    setShouldConnect
  )

  const onClose = useCallback(
    (event: CloseEvent) => {
      // Socket already cleaned up by internal handler before this callback fires
      socketRef.current = null
      setIsSocketOpen(false)

      // Only attempt reconnection if it wasn't a normal closure
      // Code 1000 = normal closure, 1001 = going away (e.g., page unload)
      if (event.code !== 1000 && event.code !== 1001) {
        console.warn(
          `WebSocket closed unexpectedly (code: ${event.code}, reason: ${event.reason || 'none'}). ` +
            `Attempting to reconnect...`
        )
        scheduleReconnect()
      } else {
        reconnectAttemptsRef.current = 0
        clearReconnectTimeout()
      }
    },

    [scheduleReconnect, clearReconnectTimeout]
  )

  const onError = useCallback((error: Event) => {
    console.error('WebSocket error:', error)
    const errorMessage =
      (error as ErrorEvent)?.message ?? error.type ?? 'unknown'
    setWebSocketStatus(t('websocket.error', { error: errorMessage }))
    setWebSocketStatusSerity('error')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const callBacks = useMemo(
    () => ({
      onMessage,
      onClose,
      onError
    }),
    [onMessage, onClose, onError]
  )

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated
  }, [isAuthenticated])

  // Reset reconnection state on successful connection and mark for calendar re-sync
  useEffect(() => {
    if (isSocketOpen) {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }

      // Reset timeout marker on successful connection
      didConnectTimeoutRef.current = false

      if (hadSocketBeforeRef.current) {
        justReconnectedRef.current = true
      }

      hadSocketBeforeRef.current = true
      reconnectAttemptsRef.current = 0

      clearReconnectTimeout()
    }
  }, [isSocketOpen, clearReconnectTimeout])

  // Manage WebSocket connection
  useEffect(() => {
    const abortController = new AbortController()

    const cleanup = (): void => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }
      closeWebSocketConnection(socketRef, setIsSocketOpen)
      delete window.__ws
      clearReconnectTimeout()
      delayedRefreshTimersRef.current.forEach(timer => clearTimeout(timer))
      delayedRefreshTimersRef.current.clear()
    }

    if (!isAuthenticated) {
      cleanup()
      reconnectAttemptsRef.current = 0

      hadSocketBeforeRef.current = false
      return
    }

    const connect = async (): Promise<void> => {
      if (isConnectingRef.current || isSocketOpen) return
      isConnectingRef.current = true
      setWebSocketConnecting(true)
      didConnectTimeoutRef.current = false
      connectTimeoutRef.current = setTimeout(() => {
        console.warn('WebSocket connection attempt timed out')

        didConnectTimeoutRef.current = true
        abortController.abort()
        connectTimeoutRef.current = null
        isConnectingRef.current = false
        setWebSocketConnecting(false)
        cleanup()

        scheduleReconnect()
      }, CONNECT_TIMEOUT_MS)

      try {
        await establishWebSocketConnection(
          callBacks,
          socketRef,
          setIsSocketOpen,
          abortController.signal
        )
        if (socketRef.current) {
          window.__ws = socketRef.current
        }
      } catch (err) {
        console.warn('WebSocket establishment failed:', err)

        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current)
          connectTimeoutRef.current = null
        }

        // Only schedule reconnect if the timeout handler hasn't already done so
        if (!didConnectTimeoutRef.current) {
          scheduleReconnect()
        }
      } finally {
        isConnectingRef.current = false
        setWebSocketConnecting(false)
      }
    }

    void connect()

    return (): void => {
      abortController.abort()
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    callBacks,
    clearReconnectTimeout,
    shouldConnect,
    scheduleReconnect
  ])

  // Register using a diff with previous calendars
  useEffect(() => {
    if (isPending) return

    // If we just reconnected, force a re-sync
    if (justReconnectedRef.current && isSocketOpen) {
      console.info('Re-syncing calendars after reconnection')
      previousCalendarListRef.current = []
      previousTempCalendarListRef.current = []
      justReconnectedRef.current = false
    }

    syncCalendarRegistrations(
      isSocketOpen,
      socketRef,
      calendarList,
      previousCalendarListRef
    )
  }, [isSocketOpen, calendarList, isPending])

  useEffect(() => {
    syncCalendarRegistrations(
      isSocketOpen,
      socketRef,
      tempCalendarList,
      previousTempCalendarListRef
    )
  }, [isSocketOpen, tempCalendarList])

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = (): void => {
      if (!isSocketOpen && isAuthenticatedRef.current) {
        reconnectAttemptsRef.current = 0
        clearReconnectTimeout()
        setShouldConnect(prev => !prev)
      }
    }

    const handleOffline = (): void => {
      cleanupConnection()
    }

    const cleanupConnection = (): void => {
      closeWebSocketConnection(socketRef, setIsSocketOpen)
      clearReconnectTimeout()
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }
      delayedRefreshTimersRef.current.forEach(timer => clearTimeout(timer))
      delayedRefreshTimersRef.current.clear()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return (): void => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isSocketOpen, isAuthenticated, clearReconnectTimeout])

  useEffect(() => {
    // Only set up ping if socket is open
    if (!isSocketOpen || !socketRef.current) {
      // Clean up existing ping if socket closed
      if (pingCleanupRef.current) {
        pingCleanupRef.current.stop()
        pingCleanupRef.current = null
      }
      return
    }

    // Set up ping monitoring
    const pingCleanup = setupWebSocketPing(socketRef.current, {
      onConnectionDead: () => {
        console.warn('WebSocket connection appears dead (no pong received)')

        // Trigger reconnection
        if (socketRef.current) {
          socketRef.current.close()
        }
      },
      onPingFail: () => {
        console.warn('Failed to send ping')
      }
    })

    pingCleanupRef.current = pingCleanup

    return (): void => {
      if (pingCleanupRef.current) {
        pingCleanupRef.current.stop()
        pingCleanupRef.current = null
      }
    }
  }, [isSocketOpen])

  const triggerReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    clearReconnectTimeout()
    setShouldConnect(prev => !prev)
  }, [clearReconnectTimeout])

  useEffect(() => {
    registerWebSocketState(socketRef, triggerReconnect)
  }, [triggerReconnect])

  // Clean up delayed refresh timers on unmount
  useEffect(() => {
    return (): void => {
      delayedRefreshTimersRef.current.forEach(timer => clearTimeout(timer))
      delayedRefreshTimersRef.current.clear()
    }
  }, [])

  return websocketStatus ? (
    <WebSocketStatusSnackbar
      message={websocketStatus}
      severity={websocketStatusSerity}
      onClose={() => {
        setWebSocketStatus('')
        setWebSocketStatusSerity(undefined)
      }}
    />
  ) : null
}
