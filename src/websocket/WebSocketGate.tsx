import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { useSelectedCalendars } from "@/utils/storage/useSelectedCalendars";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebSocketWithCleanup } from "./connection";
import { closeWebSocketConnection } from "./connection/lifecycle/closeWebSocketConnection";
import { establishWebSocketConnection } from "./connection/lifecycle/establishWebSocketConnection";
import { updateCalendars } from "./messaging";
import { syncCalendarRegistrations } from "./operations";

export function WebSocketGate() {
  const socketRef = useRef<WebSocketWithCleanup | null>(null);
  const previousCalendarListRef = useRef<string[]>([]);
  const previousTempCalendarListRef = useRef<string[]>([]);
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) =>
    Boolean(state.user.userData && state.user.tokens)
  );

  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const isPending = useAppSelector((state) => state.calendars.pending);

  const calendarList = useSelectedCalendars();
  const tempCalendarList = Object.keys(
    useAppSelector((state) => state?.calendars?.templist) ?? {}
  );

  const onMessage = useCallback(
    (message: unknown) => {
      updateCalendars(message, dispatch);
    },
    [dispatch]
  );

  const onClose = useCallback((event: CloseEvent) => {
    // Socket already cleaned up by internal handler before this callback fires
    socketRef.current = null;
    setIsSocketOpen(false);
    // TODO: Add reconnection logic here
  }, []);

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

  // Manage WebSocket connection
  useEffect(() => {
    const abortController = new AbortController();
    if (!isAuthenticated) {
      closeWebSocketConnection(socketRef, setIsSocketOpen);
      return;
    }

    establishWebSocketConnection(
      callBacks,
      socketRef,
      setIsSocketOpen,
      abortController.signal
    );

    return () => {
      abortController.abort();
      closeWebSocketConnection(socketRef, setIsSocketOpen);
    };
  }, [isAuthenticated, callBacks]);

  // Register using a diff with previous calendars
  useEffect(() => {
    if (isPending) return;

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

  return null;
}
