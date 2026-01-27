import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { AppDispatch } from "@/app/store";
import { useSelectedCalendars } from "@/utils/storage/useSelectedCalendars";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebSocketWithCleanup } from "./connection";
import { closeWebSocketConnection } from "./connection/lifecycle/closeWebSocketConnection";
import { establishWebSocketConnection } from "./connection/lifecycle/establishWebSocketConnection";
import { useWebSocketReconnect } from "./connection/lifecycle/useWebSocketReconnect";
import { updateCalendars } from "./messaging/updateCalendars";
import { syncCalendarRegistrations } from "./operations";

export function WebSocketGate() {
  const socketRef = useRef<WebSocketWithCleanup | null>(null);
  const previousCalendarListRef = useRef<string[]>([]);
  const previousTempCalendarListRef = useRef<string[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const CONNECT_TIMEOUT_MS = 10_000;

  const hadSocketBeforeRef = useRef(false);
  const justReconnectedRef = useRef(false);

  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) =>
    Boolean(state.user.userData && state.user.tokens)
  );
  const isAuthenticatedRef = useRef(isAuthenticated);

  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const isPending = useAppSelector((state) => state.calendars.pending);
  const [shouldConnect, setShouldConnect] = useState(false);

  const calendarList = useSelectedCalendars();
  const tempCalendarList = Object.keys(
    useAppSelector((state) => state?.calendars?.templist) ?? {}
  );

  const calendarsToRefreshRef = useRef<Map<string, any>>(new Map());
  const calendarsToHideRef = useRef<Set<string>>(new Set());
  const debouncedUpdateFnRef = useRef<
    ((dispatch: AppDispatch) => void) | undefined
  >();
  const currentDebouncePeriodRef = useRef<number | undefined>();

  const onMessage = useCallback(
    (message: unknown) => {
      const accumulators = {
        calendarsToRefresh: calendarsToRefreshRef.current,
        calendarsToHide: calendarsToHideRef.current,
        debouncedUpdateFn: debouncedUpdateFnRef.current,
        currentDebouncePeriod: currentDebouncePeriodRef.current,
      };
      updateCalendars(message, dispatch, accumulators);
      // Persist any mutations back to refs
      debouncedUpdateFnRef.current = accumulators.debouncedUpdateFn;
      currentDebouncePeriodRef.current = accumulators.currentDebouncePeriod;
    },
    [dispatch]
  );

  const { scheduleReconnect, clearReconnectTimeout } = useWebSocketReconnect(
    reconnectTimeoutRef,
    isAuthenticatedRef,
    reconnectAttemptsRef,
    setShouldConnect
  );

  const onClose = useCallback(
    (event: CloseEvent) => {
      // Socket already cleaned up by internal handler before this callback fires
      socketRef.current = null;
      setIsSocketOpen(false);

      // Only attempt reconnection if it wasn't a normal closure
      // Code 1000 = normal closure, 1001 = going away (e.g., page unload)
      if (event.code !== 1000 && event.code !== 1001) {
        console.warn(
          `WebSocket closed unexpectedly (code: ${event.code}, reason: ${event.reason || "none"}). ` +
            `Attempting to reconnect...`
        );
        scheduleReconnect();
      } else {
        reconnectAttemptsRef.current = 0;
        clearReconnectTimeout();
      }
    },
    [scheduleReconnect, clearReconnectTimeout]
  );

  const onError = useCallback((error: Event) => {
    console.error("WebSocket error:", error);
  }, []);

  const callBacks = useMemo(
    () => ({
      onMessage,
      onClose,
      onError,
    }),
    [onMessage, onClose, onError]
  );

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Reset reconnection state on successful connection and mark for calendar re-sync
  useEffect(() => {
    if (isSocketOpen) {
      console.log("WebSocket connected successfully");

      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }

      if (hadSocketBeforeRef.current) {
        justReconnectedRef.current = true;
      }

      hadSocketBeforeRef.current = true;
      reconnectAttemptsRef.current = 0;

      clearReconnectTimeout();
    }
  }, [isSocketOpen, clearReconnectTimeout]);

  // Manage WebSocket connection
  useEffect(() => {
    const abortController = new AbortController();

    const cleanup = () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      closeWebSocketConnection(socketRef, setIsSocketOpen);
      clearReconnectTimeout();
    };

    if (!isAuthenticated) {
      cleanup();
      reconnectAttemptsRef.current = 0;

      hadSocketBeforeRef.current = false;
      return;
    }

    const connect = async () => {
      if (isConnectingRef.current || isSocketOpen) return;
      isConnectingRef.current = true;
      connectTimeoutRef.current = setTimeout(() => {
        console.warn("WebSocket connection attempt timed out");

        cleanup();

        scheduleReconnect();
      }, CONNECT_TIMEOUT_MS);

      try {
        await establishWebSocketConnection(
          callBacks,
          socketRef,
          setIsSocketOpen,
          abortController.signal
        );
      } catch (err) {
        console.warn("WebSocket establishment failed:", err);

        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }

        scheduleReconnect();
      } finally {
        isConnectingRef.current = false;
      }
    };

    connect();

    return () => {
      abortController.abort();
      cleanup();
    };
  }, [
    isAuthenticated,
    callBacks,
    clearReconnectTimeout,
    shouldConnect,
    scheduleReconnect,
  ]);

  // Register using a diff with previous calendars
  useEffect(() => {
    if (isPending) return;

    // If we just reconnected, force a re-sync
    if (justReconnectedRef.current && isSocketOpen) {
      console.log("Re-syncing calendars after reconnection");
      previousCalendarListRef.current = [];
      previousTempCalendarListRef.current = [];
      justReconnectedRef.current = false;
    }

    syncCalendarRegistrations(
      isSocketOpen,
      socketRef,
      calendarList,
      previousCalendarListRef
    );
  }, [isSocketOpen, calendarList, isPending]);

  useEffect(() => {
    syncCalendarRegistrations(
      isSocketOpen,
      socketRef,
      tempCalendarList,
      previousTempCalendarListRef
    );
  }, [isSocketOpen, tempCalendarList]);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("Browser is online, attempting WebSocket reconnection");
      if (!isSocketOpen && isAuthenticatedRef.current) {
        reconnectAttemptsRef.current = 0;
        clearReconnectTimeout();
        setShouldConnect((prev) => !prev);
      }
    };

    const handleOffline = () => {
      console.log(
        "Browser is offline, pausing WebSocket reconnection attempts"
      );
      cleanupConnection();
    };

    const cleanupConnection = () => {
      closeWebSocketConnection(socketRef, setIsSocketOpen);
      clearReconnectTimeout();
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isSocketOpen, isAuthenticated, clearReconnectTimeout]);

  return null;
}
