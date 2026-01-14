import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useSelectedCalendars } from "../utils/storage/useSelectedCalendars";
import { closeWebSocketConnection } from "./utils/closeWebSocketConnection";
import { WebSocketWithCleanup } from "./createWebSocketConnection";
import { establishWebSocketConnection } from "./utils/establishWebSocketConnection";
import { syncCalendarRegistrations } from "./utils/syncCalendarRegistrations";
import { updateCalendars } from "./utils/updateCalendars";

export function WebSocketGate() {
  const socketRef = useRef<WebSocketWithCleanup | null>(null);
  const previousCalendarListRef = useRef<string[]>([]);
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) =>
    Boolean(state.user.userData && state.user.tokens)
  );
  const [isSocketOpen, setIsSocketOpen] = useState(false);

  const calendarList = useSelectedCalendars();

  const callBacks = {
    onMessage: (message: unknown) => {
      updateCalendars(message, dispatch);
    },
    onClose: (event: CloseEvent) => {
      setIsSocketOpen(false);
      socketRef.current = null;
      // TODO: Add reconnection logic here
    },
    onError: (error: Event) => {
      console.error("WebSocket error:", error);
    },
  };

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
