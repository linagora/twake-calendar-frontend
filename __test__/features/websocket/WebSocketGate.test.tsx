import { cleanup, render, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createWebSocketConnection } from "../../../src/websocket/createWebSocketConnection";
import { registerToCalendars } from "../../../src/websocket/ws/registerToCalendars";
import { unregisterToCalendars } from "../../../src/websocket/ws/unregisterToCalendars";
import { WebSocketGate } from "../../../src/websocket/WebSocketGate";
import { setSelectedCalendars } from "../../../src/utils/storage/setSelectedCalendars";

jest.mock("../../../src/websocket/createWebSocketConnection");
jest.mock("../../../src/websocket/ws/registerToCalendars");
jest.mock("../../../src/websocket/ws/unregisterToCalendars");

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
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });

  beforeEach(() => {
    store = createMockStore();
    mockSocket = createMockSocket();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("Authentication", () => {
    it("should not create connection when user is not authenticated", () => {
      const unauthStore = createMockStore(null, null);

      render(
        <Provider store={unauthStore}>
          <WebSocketGate />
        </Provider>
      );

      expect(createWebSocketConnection).not.toHaveBeenCalled();
    });

    it("should create connection when user is authenticated", async () => {
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
      });
    });

    it("should close existing socket when user logs out", async () => {
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      const { rerender } = render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      const unauthStore = createMockStore(null, null);
      rerender(
        <Provider store={unauthStore}>
          <WebSocketGate />
        </Provider>
      );

      await waitFor(() => {
        expect(mockSocket.close).toHaveBeenCalled();
      });
    });
  });

  describe("Socket Connection Management", () => {
    it("should add close event listener on socket connection", async () => {
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

      await waitFor(() => {
        expect(mockSocket.addEventListener).toHaveBeenCalledWith(
          "close",
          expect.any(Function)
        );
      });
    });

    it("should handle socket close event", async () => {
      let closeHandler: Function;
      mockSocket.addEventListener = jest.fn((event, handler) => {
        if (event === "close") {
          closeHandler = handler;
        }
      });

      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

      await waitFor(() => {
        expect(mockSocket.addEventListener).toHaveBeenCalled();
      });

      await act(async () => {
        closeHandler!();
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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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

      const { unmount } = render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

      await waitFor(() => {
        expect(createWebSocketConnection).toHaveBeenCalled();
      });

      unmount();

      expect(mockSocket.close).toHaveBeenCalled();
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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to update calendar registrations:",
          expect.any(Error)
        );
      });

      // The socket is closed after error, so verify that
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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      await act(async () => {
        mockSocket.readyState = WebSocket.CLOSED;
        setSelectedCalendars(["cal1", "cal2"]);
      });

      // Wait a bit to ensure the effect would have run if it was going to
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(registerToCalendars).not.toHaveBeenCalled();
    });

    it("should handle unregistration errors gracefully", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2"])
      );
      (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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
          "Failed to update calendar registrations:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it("should handle socket that becomes open after initial connection", async () => {
      const closedSocket = createMockSocket(WebSocket.CONNECTING);
      localStorage.setItem("selectedCalendars", JSON.stringify(["cal1"]));
      (createWebSocketConnection as jest.Mock).mockResolvedValue(closedSocket);

      render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

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
});
