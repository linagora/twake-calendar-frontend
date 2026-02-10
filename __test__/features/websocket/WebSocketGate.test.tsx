import { setSelectedCalendars } from "@/utils/storage/setSelectedCalendars";
import { createWebSocketConnection } from "@/websocket/connection/createConnection";
import { registerToCalendars } from "@/websocket/operations/registerToCalendars";
import { unregisterToCalendars } from "@/websocket/operations/unregisterToCalendars";
import { WebSocketGate } from "@/websocket/WebSocketGate";
import { configureStore, Store } from "@reduxjs/toolkit";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { I18nContext } from "twake-i18n";

jest.mock("@/websocket/connection/createConnection");
jest.mock("@/websocket/operations/registerToCalendars");
jest.mock("@/websocket/operations/unregisterToCalendars");
jest.mock("@/websocket/connection/lifecycle/pingWebSocket");

function TestWrapper({ store }: { store: Store }) {
  return (
    <I18nContext.Provider
      value={{
        t: (key: string, vars?: Record<string, string>) => {
          if (key === "locale") return "en";
          if (vars) {
            const params = Object.entries(vars)
              .map(([k, v]) => `${k}=${v}`)
              .join(",");
            return `${key}(${params})`;
          }
          return key;
        },
        f: (date: Date) => date.toString(),
        lang: "en",
      }}
    >
      <Provider store={store}>
        <WebSocketGate />
      </Provider>
    </I18nContext.Provider>
  );
}

describe("WebSocketGate", () => {
  let store: any;
  let mockSocket: any;

  const createMockStore = (
    userData: any = { id: "1" },
    tokens: any = { access: "token" }
  ) => {
    return configureStore({
      reducer: {
        user: (state = { userData, tokens }) => state,
        calendars: (state = { list: {} }) => state,
      },
    });
  };

  const createMockSocket = (readyState = WebSocket.OPEN) => ({
    readyState,
    close: jest.fn(),
    send: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    cleanup: jest.fn(),
    onmessage: null,
  });

  beforeEach(() => {
    store = createMockStore();
    mockSocket = createMockSocket();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
  });

  describe("Authentication", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
      jest.resetModules();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });
    it("should not create connection when user is not authenticated", () => {
      const unauthStore = createMockStore(null, null);

      render(<TestWrapper store={unauthStore} />);

      expect(createWebSocketConnection).not.toHaveBeenCalled();
    });

    it("should create connection when user is authenticated", async () => {
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });
    });

    it("should close existing socket when user logs out", async () => {
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      const { rerender } = render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      const unauthStore = createMockStore(null, null);
      rerender(<TestWrapper store={unauthStore} />);

      await waitFor(() => {
        expect(mockSocket.close).toHaveBeenCalled();
      });
    });
  });

  describe("Socket Connection Management", () => {
    it("should create connection with callbacks", async () => {
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledWith(
          expect.objectContaining({
            onMessage: expect.any(Function),
            onClose: expect.any(Function),
            onError: expect.any(Function),
          })
        );
      });
    });

    it("should handle socket close via callback", async () => {
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      // Simulate close event
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close"));
      });

      // Verify that subsequent calendar changes don't try to register
      await act(async () => {
        setSelectedCalendars(["cal1"]);
      });

      await waitFor(() => {
        expect(registerToCalendars).not.toHaveBeenCalled();
      });
    });

    it("should handle connection errors gracefully", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (createWebSocketConnection as jest.Mock).mockRejectedValue(
        new Error("Connection failed")
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to create WebSocket connection:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it("should close socket on component unmount", async () => {
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      const { unmount } = render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      unmount();

      expect(mockSocket.close).toHaveBeenCalled();
    });
  });

  describe("Reconnection Logic", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
      jest.resetModules();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });
    it("should trigger reconnection on unexpected close (code 1006)", async () => {
      jest.useFakeTimers();
      const consoleWarn = jest.spyOn(console, "warn").mockImplementation();
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // Simulate unexpected close
      await act(async () => {
        onCloseCallback?.(
          new CloseEvent("close", { code: 1006, reason: "Connection lost" })
        );
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WebSocket closed unexpectedly (code: 1006")
      );

      // Advance timer to trigger reconnection
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(2);
      });

      consoleWarn.mockRestore();
      jest.useRealTimers();
    });

    it("should NOT reconnect on normal close (code 1000)", async () => {
      jest.useFakeTimers();
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // Simulate normal close
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1000 }));
      });

      // Advance timer
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Should NOT reconnect
      expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it("should NOT reconnect on going away (code 1001)", async () => {
      jest.useFakeTimers();
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // Simulate going away
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1001 }));
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it("should reset reconnection attempts counter on successful connection", async () => {
      jest.useFakeTimers();
      const consoleLog = jest.spyOn(console, "info").mockImplementation();
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // First failure
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
        jest.advanceTimersByTime(1000);
      });

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining("(attempt 1/10)")
      );

      // Success - should reset counter
      // Next failure should start from attempt 1 again
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
      });

      // Should schedule with initial delay (attempt 1)
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining("(attempt 1/10)")
      );

      consoleLog.mockRestore();
      jest.useRealTimers();
    });

    it("should not reconnect if authentication is lost during reconnection timeout", async () => {
      jest.useFakeTimers();
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      const { rerender } = render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // Trigger reconnection
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
      });

      // Lose authentication before timeout fires
      const unauthStore = createMockStore(null, null);
      rerender(<TestWrapper store={unauthStore} />);

      // Advance timer
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should NOT reconnect (still only 1 connection)
      expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it("should clear reconnection timeout on component unmount", async () => {
      jest.useFakeTimers();
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      const { unmount } = render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // Trigger reconnection
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
      });

      // Unmount before timeout fires
      unmount();

      // Advance timer
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should NOT reconnect after unmount
      expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it("should re-sync calendars after reconnection", async () => {
      jest.useFakeTimers();
      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2"])
      );
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          "/calendars/cal1",
          "/calendars/cal2",
        ]);
      });

      jest.clearAllMocks();

      // Close and reconnect
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
        jest.advanceTimersByTime(1000);
      });

      // Should re-register all calendars after reconnection
      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          "/calendars/cal1",
          "/calendars/cal2",
        ]);
      });
      jest.useRealTimers();
    });
  });

  describe("Browser Online/Offline Events", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
      jest.resetModules();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });
    it("should trigger immediate reconnection when browser goes online", async () => {
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // Close connection
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
      });

      // Trigger online event
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });

      // Should trigger immediate reconnection (no delay)
      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(2);
      });
    });

    it("should pause reconnection attempts when browser goes offline", async () => {
      jest.useFakeTimers();
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // Close connection
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
      });

      // Go offline before reconnection fires
      await act(async () => {
        window.dispatchEvent(new Event("offline"));
      });

      // Advance timer - should NOT reconnect
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it("should not reconnect when online event fires if already connected", async () => {
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // Trigger online event while connected
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });

      // Should NOT trigger new connection
      expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
    });

    it("should reset attempt counter when online event fires", async () => {
      jest.useFakeTimers();
      const consoleLog = jest.spyOn(console, "info").mockImplementation();
      let onCloseCallback: Function | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      // Multiple failed attempts
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
        jest.advanceTimersByTime(2000);
      });

      // Go offline then online
      await act(async () => {
        window.dispatchEvent(new Event("offline"));
        window.dispatchEvent(new Event("online"));
      });

      // Next reconnection should start from attempt 1
      await act(async () => {
        onCloseCallback?.(new CloseEvent("close", { code: 1006 }));
      });

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining("(attempt 1/10)")
      );

      consoleLog.mockRestore();
      jest.useRealTimers();
    });
  });

  describe("Calendar Registration", () => {
    it("should not register if socket is not open", async () => {
      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2"])
      );

      const connectingSocket = createMockSocket(WebSocket.CONNECTING);
      (createWebSocketConnection as jest.Mock).mockResolvedValue(
        connectingSocket
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      expect(registerToCalendars).not.toHaveBeenCalled();
    });

    it("should register to calendars when socket opens and calendars are selected", async () => {
      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2"])
      );
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          "/calendars/cal1",
          "/calendars/cal2",
        ]);
      });
    });

    it("should register only new calendars when calendar list changes", async () => {
      localStorage.setItem("selectedCalendars", JSON.stringify(["cal1"]));
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          "/calendars/cal1",
        ]);
      });

      jest.clearAllMocks();

      await act(async () => {
        setSelectedCalendars(["cal1", "cal2", "cal3"]);
      });

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          "/calendars/cal2",
          "/calendars/cal3",
        ]);
      });
    });

    it("should unregister removed calendars when calendar list changes", async () => {
      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2", "cal3"])
      );
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      await act(async () => {
        setSelectedCalendars(["cal1"]);
      });

      await waitFor(() => {
        expect(unregisterToCalendars).toHaveBeenCalledWith(mockSocket, [
          "/calendars/cal2",
          "/calendars/cal3",
        ]);
      });
    });

    it("should both register and unregister when calendar list partially changes", async () => {
      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2"])
      );
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      await act(async () => {
        setSelectedCalendars(["cal1", "cal3"]);
      });

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          "/calendars/cal3",
        ]);
        expect(unregisterToCalendars).toHaveBeenCalledWith(mockSocket, [
          "/calendars/cal2",
        ]);
      });
    });

    it("should handle registration errors and not update previous calendar list", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      localStorage.setItem("selectedCalendars", JSON.stringify(["cal1"]));
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);
      (registerToCalendars as jest.Mock).mockImplementation(() => {
        throw new Error("Registration failed");
      });

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to register calendar:",
          expect.any(Error)
        );
      });

      await waitFor(() => {
        expect(mockSocket.close).not.toHaveBeenCalled();
      });

      jest.clearAllMocks();
      (registerToCalendars as jest.Mock).mockImplementation(() => {});

      await act(async () => {
        setSelectedCalendars(["cal1", "cal2"]);
      });

      await waitFor(() => {
        // Should register both calendars since previous update failed and didn't update the ref
        expect(registerToCalendars).toHaveBeenCalledWith(mockSocket, [
          "/calendars/cal1",
          "/calendars/cal2",
        ]);
      });

      consoleError.mockRestore();
    });

    it("should not attempt registration when no calendars are selected", async () => {
      localStorage.setItem("selectedCalendars", JSON.stringify([]));
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      expect(registerToCalendars).not.toHaveBeenCalled();
      expect(unregisterToCalendars).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid calendar changes correctly", async () => {
      localStorage.setItem("selectedCalendars", JSON.stringify(["cal1"]));
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalledTimes(1);
      });

      // Rapid changes
      await act(async () => {
        setSelectedCalendars(["cal1", "cal2"]);
        setSelectedCalendars(["cal1", "cal2", "cal3"]);
      });

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled();
      });
    });

    it("should handle socket closed during calendar update", async () => {
      localStorage.setItem("selectedCalendars", JSON.stringify(["cal1"]));
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      await act(async () => {
        mockSocket.readyState = WebSocket.CLOSED;
        setSelectedCalendars(["cal1", "cal2"]);
      });

      // Wait a bit to ensure the effect would have run if it was going to
      jest.useFakeTimers();
      jest.advanceTimersByTime(100);
      jest.useRealTimers();
      expect(registerToCalendars).not.toHaveBeenCalled();
    });

    it("should handle unregistration errors gracefully", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2"])
      );
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled();
      });

      jest.clearAllMocks();
      (unregisterToCalendars as jest.Mock).mockImplementation(() => {
        throw new Error("Unregistration failed");
      });

      await act(async () => {
        setSelectedCalendars(["cal1"]);
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to unregister calendar:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it("should handle socket that becomes open after initial connection", async () => {
      const closedSocket = createMockSocket(WebSocket.CONNECTING);
      localStorage.setItem("selectedCalendars", JSON.stringify(["cal1"]));
      (createWebSocketConnection as jest.Mock).mockResolvedValue(closedSocket);

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      // Socket is not open yet, should not register
      expect(registerToCalendars).not.toHaveBeenCalled();

      // Simulate socket becoming open
      await act(async () => {
        closedSocket.readyState = WebSocket.OPEN;
        // Trigger a calendar change to re-run the effect
        setSelectedCalendars(["cal1", "cal2"]);
      });

      // Still should not register because isSocketOpen state is false
      // The component only sets isSocketOpen to true when socket.readyState is OPEN during connection
      expect(registerToCalendars).not.toHaveBeenCalled();
    });
  });

  describe("Ping/Pong Integration", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("should trigger reconnection when ping detects dead connection (via socket close)", async () => {
      const consoleWarn = jest.spyOn(console, "warn").mockImplementation();
      let onCloseCallback: ((event: CloseEvent) => void) | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      (createWebSocketConnection as jest.Mock).mockClear();

      // In the real implementation, when ping detects dead connection,
      // it calls socket.close() which triggers the onClose callback
      // This simulates that flow
      await act(async () => {
        if (onCloseCallback) {
          onCloseCallback(new CloseEvent("close", { code: 1006 }));
        }
      });

      // Should schedule reconnection
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WebSocket closed unexpectedly")
      );

      // Advance to trigger reconnection
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      // Should reconnect
      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });

      consoleWarn.mockRestore();
    });

    it("should stop ping monitoring when socket closes normally", async () => {
      let onCloseCallback: ((event: CloseEvent) => void) | undefined;

      (createWebSocketConnection as jest.Mock).mockImplementation(
        (callbacks) => {
          onCloseCallback = callbacks.onClose;
          return Promise.resolve(mockSocket);
        }
      );

      render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      // Normal close (code 1000) - like logout or page navigation
      await act(async () => {
        if (onCloseCallback) {
          onCloseCallback(new CloseEvent("close", { code: 1000 }));
        }
      });

      // Should not attempt reconnection
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
    });

    it("should cleanup ping monitoring on component unmount", async () => {
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      const { unmount } = render(<TestWrapper store={store} />);

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      // Unmount should cleanup
      unmount();

      expect(mockSocket.close).toHaveBeenCalled();
    });
  });
});
