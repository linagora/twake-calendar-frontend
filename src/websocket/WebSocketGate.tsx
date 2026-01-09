import { useEffect, useRef } from "react";
import { useAppSelector } from "../app/hooks";
import { createWebSocketConnection } from "./createWebSocketConnection";
import { registerToCalendars } from "./websocketAPI/registerToCalendars";

export function WebSocketGate() {
  const socketRef = useRef<WebSocket | null>(null);

  const isAuthenticated = useAppSelector((state) =>
    Boolean(state.user.userData && state.user.tokens)
  );

  const calendarList = useAppSelector((state) => state.calendars.list);

  // Manage WebSocket connection
  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const connect = async () => {
      try {
        const socket = await createWebSocketConnection();
        socketRef.current = socket;
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
      }
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const hasRegisteredRef = useRef(false);

  // Register to calendars once
  useEffect(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (hasRegisteredRef.current) {
      return;
    }

    const calendarPaths = Object.values(calendarList).map(
      (cal) => `/calendars/${cal.id}`
    );

    if (calendarPaths.length > 0) {
      registerToCalendars(socketRef.current, calendarPaths);
      hasRegisteredRef.current = true;
    }
  }, [calendarList]);

  return null;
}
