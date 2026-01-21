import { getRetryDelay, RetryBackoffConfig } from "@/utils/getRetryDelay";
import { Dispatch, MutableRefObject, SetStateAction, useCallback } from "react";

export const RECONNECT_CONFIG: RetryBackoffConfig = {
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
};
export const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocketReconnect(
  reconnectTimeoutRef: MutableRefObject<NodeJS.Timeout | null>,
  isAuthenticatedRef: MutableRefObject<boolean>,
  reconnectAttemptsRef: MutableRefObject<number>,
  setShouldConnect: Dispatch<SetStateAction<boolean>>
) {
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!isAuthenticatedRef.current) return;

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error(
        `Max WebSocket reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`
      );
      return;
    }

    clearReconnectTimeout();

    const delay = getRetryDelay(reconnectAttemptsRef.current, RECONNECT_CONFIG);
    console.log(
      `Scheduling WebSocket reconnection in ${Math.round(delay)}ms ` +
        `(attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isAuthenticatedRef.current) return;

      reconnectAttemptsRef.current += 1;
      console.log(
        `Attempting WebSocket reconnection (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
      );

      setShouldConnect((prev: any) => !prev);
    }, delay);
  }, [clearReconnectTimeout]);
  return { scheduleReconnect, clearReconnectTimeout };
}
