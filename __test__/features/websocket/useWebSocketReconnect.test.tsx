import { getRetryDelay } from "@/utils/getRetryDelay";
import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_CONFIG,
  useWebSocketReconnect,
} from "@/websocket/connection/lifecycle/useWebSocketReconnect";
import { act, renderHook } from "@testing-library/react";
import { MutableRefObject } from "react";

// Mock the retry delay utility
jest.mock("@/utils/getRetryDelay");
const mockGetRetryDelay = getRetryDelay as jest.MockedFunction<
  typeof getRetryDelay
>;

describe("useWebSocketReconnect", () => {
  let reconnectTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  let isAuthenticatedRef: MutableRefObject<boolean>;
  let reconnectAttemptsRef: MutableRefObject<number>;
  let setShouldConnect: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    reconnectTimeoutRef = { current: null };
    isAuthenticatedRef = { current: true };
    reconnectAttemptsRef = { current: 0 };
    setShouldConnect = jest.fn();
    mockGetRetryDelay.mockReturnValue(1000); // Default 1 second delay
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("scheduleReconnect", () => {
    it("should schedule a reconnection with correct delay", () => {
      const { result } = renderHook(() =>
        useWebSocketReconnect(
          reconnectTimeoutRef,
          isAuthenticatedRef, // isAuthenticated
          reconnectAttemptsRef,
          setShouldConnect
        )
      );

      act(() => {
        result.current.scheduleReconnect();
      });

      expect(mockGetRetryDelay).toHaveBeenCalledWith(0, RECONNECT_CONFIG);
      expect(reconnectTimeoutRef.current).not.toBeNull();
      expect(setShouldConnect).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(setShouldConnect).toHaveBeenCalledWith(expect.any(Function));
      expect(reconnectAttemptsRef.current).toBe(1);
    });

    it("should not schedule reconnection if not authenticated", () => {
      isAuthenticatedRef = { current: false };
      const { result } = renderHook(() =>
        useWebSocketReconnect(
          reconnectTimeoutRef,
          isAuthenticatedRef, // Not authenticated
          reconnectAttemptsRef,
          setShouldConnect
        )
      );

      act(() => {
        result.current.scheduleReconnect();
      });

      expect(reconnectTimeoutRef.current).toBeNull();
      expect(mockGetRetryDelay).not.toHaveBeenCalled();
    });

    it("should stop after MAX_RECONNECT_ATTEMPTS", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;

      const { result } = renderHook(() =>
        useWebSocketReconnect(
          reconnectTimeoutRef,
          isAuthenticatedRef,
          reconnectAttemptsRef,
          setShouldConnect
        )
      );

      act(() => {
        result.current.scheduleReconnect();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Max WebSocket reconnection attempts (${MAX_RECONNECT_ATTEMPTS})`
        )
      );
      expect(reconnectTimeoutRef.current).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it("should increment attempt counter on each reconnection", () => {
      const { result } = renderHook(() =>
        useWebSocketReconnect(
          reconnectTimeoutRef,
          isAuthenticatedRef,
          reconnectAttemptsRef,
          setShouldConnect
        )
      );

      expect(reconnectAttemptsRef.current).toBe(0);

      act(() => {
        result.current.scheduleReconnect();
        jest.advanceTimersByTime(1000);
      });

      expect(reconnectAttemptsRef.current).toBe(1);

      act(() => {
        result.current.scheduleReconnect();
        jest.advanceTimersByTime(1000);
      });

      expect(reconnectAttemptsRef.current).toBe(2);
    });

    it("should toggle setShouldConnect correctly", () => {
      const { result } = renderHook(() =>
        useWebSocketReconnect(
          reconnectTimeoutRef,
          isAuthenticatedRef,
          reconnectAttemptsRef,
          setShouldConnect
        )
      );

      act(() => {
        result.current.scheduleReconnect();
        jest.advanceTimersByTime(1000);
      });

      expect(setShouldConnect).toHaveBeenCalledTimes(1);

      // Test the toggle function
      const toggleFn = setShouldConnect.mock.calls[0][0];
      expect(toggleFn(false)).toBe(true);
      expect(toggleFn(true)).toBe(false);
    });
  });

  describe("clearReconnectTimeout", () => {
    it("should clear pending timeout", () => {
      const { result } = renderHook(() =>
        useWebSocketReconnect(
          reconnectTimeoutRef,
          isAuthenticatedRef,
          reconnectAttemptsRef,
          setShouldConnect
        )
      );

      act(() => {
        result.current.scheduleReconnect();
      });

      expect(reconnectTimeoutRef.current).not.toBeNull();

      act(() => {
        result.current.clearReconnectTimeout();
      });

      expect(reconnectTimeoutRef.current).toBeNull();

      // Timeout should not fire
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(setShouldConnect).not.toHaveBeenCalled();
    });

    it("should handle multiple clears gracefully", () => {
      const { result } = renderHook(() =>
        useWebSocketReconnect(
          reconnectTimeoutRef,
          isAuthenticatedRef,
          reconnectAttemptsRef,
          setShouldConnect
        )
      );

      act(() => {
        result.current.clearReconnectTimeout();
        result.current.clearReconnectTimeout();
        result.current.clearReconnectTimeout();
      });

      expect(reconnectTimeoutRef.current).toBeNull();
    });

    it("should clear timeout before scheduling new one", () => {
      const { result } = renderHook(() =>
        useWebSocketReconnect(
          reconnectTimeoutRef,
          isAuthenticatedRef,
          reconnectAttemptsRef,
          setShouldConnect
        )
      );

      // Schedule first reconnection
      act(() => {
        result.current.scheduleReconnect();
      });

      const firstTimeout = reconnectTimeoutRef.current;
      expect(firstTimeout).not.toBeNull();

      // Schedule second reconnection (should clear first)
      act(() => {
        result.current.scheduleReconnect();
      });

      const secondTimeout = reconnectTimeoutRef.current;
      expect(secondTimeout).not.toBeNull();
      expect(secondTimeout).not.toBe(firstTimeout);

      // Only second timeout should fire
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(setShouldConnect).toHaveBeenCalledTimes(1);
    });
  });
  it("should stop reconnecting after MAX_RECONNECT_ATTEMPTS (10)", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const { result } = renderHook(() =>
      useWebSocketReconnect(
        reconnectTimeoutRef,
        isAuthenticatedRef,
        reconnectAttemptsRef,
        setShouldConnect
      )
    );

    // Simulate 10 reconnection attempts
    for (let i = 0; i < MAX_RECONNECT_ATTEMPTS; i++) {
      act(() => {
        result.current.scheduleReconnect();
        jest.advanceTimersByTime(
          mockGetRetryDelay.mock.results[i]?.value || 1000
        );
      });
    }

    expect(reconnectAttemptsRef.current).toBe(MAX_RECONNECT_ATTEMPTS);
    expect(setShouldConnect).toHaveBeenCalledTimes(MAX_RECONNECT_ATTEMPTS);

    // Try to schedule one more reconnection - should fail
    act(() => {
      result.current.scheduleReconnect();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Max WebSocket reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`
    );
    expect(reconnectTimeoutRef.current).toBeNull();
    expect(setShouldConnect).toHaveBeenCalledTimes(MAX_RECONNECT_ATTEMPTS); // Should not increment

    consoleErrorSpy.mockRestore();
  });
});
