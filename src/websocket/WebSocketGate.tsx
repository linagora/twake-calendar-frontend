import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useSelectedCalendars } from "../utils/storage/useSelectedCalendars";
import {
  createWebSocketConnection,
  WebSocketWithCleanup,
} from "./createWebSocketConnection";
import { registerToCalendars } from "./ws/registerToCalendars";
import { unregisterToCalendars } from "./ws/unregisterToCalendars";

export function WebSocketGate() {
  const socketRef = useRef<WebSocketWithCleanup | null>(null);
  const previousCalendarListRef = useRef<string[]>([]);
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) =>
    Boolean(state.user.userData && state.user.tokens)
  );
  const [isSocketOpen, setIsSocketOpen] = useState(false);

  const calendarList = useSelectedCalendars();

  // Manage WebSocket connection
  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.cleanup();
        socketRef.current.close();
        socketRef.current = null;
        setIsSocketOpen(false);
      }
      return;
    }

    const connect = async () => {
      try {
        const socket = await createWebSocketConnection(dispatch);
        socketRef.current = socket;
        socket.addEventListener("close", () => {
          setIsSocketOpen(false);
          socketRef.current = null;
        });
        // Check if socket closed during setup
        if (socket.readyState === WebSocket.OPEN) {
          setIsSocketOpen(true);
        }
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
      }
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.cleanup();
        socketRef.current.close();
        socketRef.current = null;
        setIsSocketOpen(false);
      }
    };
  }, [isAuthenticated, dispatch]);

  // Register using a diff with previous calendars
  useEffect(() => {
    if (
      !isSocketOpen ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    )
      return;

    const currentPaths = calendarList.map((cal) => `/calendars/${cal}`);
    const previousPaths = previousCalendarListRef.current.map(
      (cal) => `/calendars/${cal}`
    );

    // calendars to register
    const toRegister = currentPaths.filter(
      (path) => !previousPaths.includes(path)
    );

    // calendars to unregister
    const toUnregister = previousPaths.filter(
      (path) => !currentPaths.includes(path)
    );

    try {
      if (toRegister.length > 0) {
        registerToCalendars(socketRef.current, toRegister);
      }

      if (toUnregister.length > 0) {
        unregisterToCalendars(socketRef.current, toUnregister);
      }

      // Only update the ref if operations succeeded
      previousCalendarListRef.current = calendarList;
    } catch (error) {
      console.error("Failed to update calendar registrations:", error);
    }
  }, [isSocketOpen, calendarList]);

  return null;
}
