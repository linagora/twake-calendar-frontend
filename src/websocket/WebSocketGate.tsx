import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { AppDispatch } from "@/app/store";
import { useSelectedCalendars } from "@/utils/storage/useSelectedCalendars";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebSocketWithCleanup } from "./connection";
import { closeWebSocketConnection } from "./connection/lifecycle/closeWebSocketConnection";
import { establishWebSocketConnection } from "./connection/lifecycle/establishWebSocketConnection";
import { updateCalendars } from "./messaging/updateCalendars";
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
