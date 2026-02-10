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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    reconnectAttemptsRef.current += 1;

    console.info(
      `Scheduling WebSocket reconnection in ${Math.round(delay)}ms ` +
        `(attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isAuthenticatedRef.current) {
        reconnectTimeoutRef.current = null;
        return;
      }
      console.info(
        `Attempting WebSocket reconnection (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
      );
      setShouldConnect((prev) => !prev);
      clearReconnectTimeout();
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearReconnectTimeout]);
  return { scheduleReconnect, clearReconnectTimeout };
}
