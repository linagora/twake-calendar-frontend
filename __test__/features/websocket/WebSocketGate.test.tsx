import { cleanup, render, waitFor } from "@testing-library/react";
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

      closeHandler!();

      // Verify that subsequent calendar changes don't try to register
      localStorage.setItem("selectedCalendars", JSON.stringify(["cal1"]));

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

      const { rerender } = render(
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

      setSelectedCalendars(["cal1", "cal2", "cal3"]);

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

      const { rerender } = render(
        <Provider store={store}>
          <WebSocketGate />
        </Provider>
      );

      await waitFor(() => {
        expect(registerToCalendars).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      setSelectedCalendars(["cal1"]);

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

      setSelectedCalendars(["cal1", "cal3"]);
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

      jest.clearAllMocks();
      (registerToCalendars as jest.Mock).mockImplementation(() => {});

      setSelectedCalendars(["cal1", "cal2"]);
      await waitFor(() => {
        // Should still register both calendars since previous update failed
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
      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2"])
      );
      window.dispatchEvent(new Event("storage"));

      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2", "cal3"])
      );
      window.dispatchEvent(new Event("storage"));

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
      mockSocket.readyState = WebSocket.CLOSED;

      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(["cal1", "cal2"])
      );
      window.dispatchEvent(new Event("storage"));

      await waitFor(() => {
        expect(registerToCalendars).not.toHaveBeenCalled();
      });
    });
  });
});
