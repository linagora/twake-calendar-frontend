import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { useSelectedCalendars } from "@/utils/storage/useSelectedCalendars";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebSocketWithCleanup } from './connection';
import { closeWebSocketConnection } from "./connection/lifecycle/closeWebSocketConnection";
import { establishWebSocketConnection } from "./connection/lifecycle/establishWebSocketConnection";
import { updateCalendars } from './messaging';
import { syncCalendarRegistrations } from './operations';



export function WebSocketGate() {
  const socketRef = useRef<WebSocketWithCleanup | null>(null);
  const previousCalendarListRef = useRef<string[]>([]);
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) =>
    Boolean(state.user.userData && state.user.tokens)
  );

  const [isSocketOpen, setIsSocketOpen] = useState(false);

  const calendarList = useSelectedCalendars();
  const onMessage = useCallback(
    (message: unknown) => {
      updateCalendars(message, dispatch);
    },
    [dispatch]
  );

  const onClose = useCallback((event: CloseEvent) => {
    closeWebSocketConnection(socketRef, setIsSocketOpen);
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
  }, [isAuthenticated, dispatch, callBacks]);

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
