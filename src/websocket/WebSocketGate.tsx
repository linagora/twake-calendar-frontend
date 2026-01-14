import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useSelectedCalendars } from "../utils/storage/useSelectedCalendars";
import { WebSocketWithCleanup } from "./createWebSocketConnection";
import { closeWebSocketConnection } from "./utils/closeWebSocketConnection";
import { establishWebSocketConnection } from "./utils/establishWebSocketConnection";
import { syncCalendarRegistrations } from "./utils/syncCalendarRegistrations";
import { updateCalendars } from "./utils/updateCalendars";

export function WebSocketGate() {
  const socketRef = useRef<WebSocketWithCleanup | null>(null);
  const previousCalendarListRef = useRef<string[]>([]);
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state);
  const isAuthenticated = Boolean(state.user.userData && state.user.tokens);

  const [isSocketOpen, setIsSocketOpen] = useState(false);

  const calendarList = useSelectedCalendars();
  const onMessage = useCallback(
    (message: unknown) => {
      updateCalendars(message, dispatch, state);
    },
    [dispatch]
  );

  const onClose = useCallback((event: CloseEvent) => {
    setIsSocketOpen(false);
    socketRef.current = null;
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
    if (!isAuthenticated) {
      closeWebSocketConnection(socketRef, setIsSocketOpen);
      return;
    }

    establishWebSocketConnection(callBacks, socketRef, setIsSocketOpen);

    return () => {
      closeWebSocketConnection(socketRef, setIsSocketOpen);
    };
  }, [isAuthenticated, dispatch]);

  // Register using a diff with previous calendars
  useEffect(() => {
    syncCalendarRegistrations(
      isSocketOpen,
      socketRef,
      calendarList,
      previousCalendarListRef
    );
  }, [isSocketOpen, calendarList]);

  return null;
}
