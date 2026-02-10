import { fetchWebSocketTicket } from "@/websocket/api/fetchWebSocketTicket";
import { createWebSocketConnection } from "@/websocket/connection/createConnection";
import { WS_INBOUND_EVENTS } from "@/websocket/protocols";
import { waitFor } from "@testing-library/dom";
import { setupWebsocket } from "./utils/setupWebsocket";

jest.mock("@/websocket/api/fetchWebSocketTicket");

describe("createWebSocketConnection", () => {
  let mockWebSocket: jest.Mock;
  let cleanup: () => void;
  let webSocketInstances: any[] = [];

  const mockTicket = {
    value: "test-ticket-123",
    clientAddress: "127.0.0.1",
    generatedOn: "2025-01-12T10:00:00Z",
    validUntil: "2025-01-12T11:00:00Z",
    username: "testuser",
  };

  /** ---------- Helpers ---------- */

  const getWs = () => webSocketInstances[0];

  const triggerEvent = (ws: any, event: string, payload?: any) => {
    ws._listeners[event]?.[0]?.(payload);
  };

  const createAndOpenConnection = async () => {
    const mockCallbacks = {
      onMessage: jest.fn(),
      onClose: jest.fn(),
      onError: jest.fn(),
    };
    const promise = createWebSocketConnection(mockCallbacks);

    await waitFor(() => {
      expect(webSocketInstances.length).toBe(1);
    });

    triggerEvent(getWs(), WS_INBOUND_EVENTS.CONNECTION_OPENED);
    const socket = await promise;

    return { socket, ws: getWs(), promise, mockCallbacks };
  };

  /** ---------- Setup ---------- */

  beforeEach(() => {
    ({ webSocketInstances, mockWebSocket, cleanup } = setupWebsocket());
    window.WEBSOCKET_URL = "wss://calendar.example.com";

    (fetchWebSocketTicket as jest.Mock).mockResolvedValue(mockTicket);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete window.WEBSOCKET_URL;
    delete window.CALENDAR_BASE_URL;
    cleanup();
  });

  /** ---------- Tests ---------- */

  it("throws when WEBSOCKET_URL is not defined", async () => {
    delete window.WEBSOCKET_URL;
    const mockCallbacks = {
      onMessage: jest.fn(),
    };

    await expect(createWebSocketConnection(mockCallbacks)).rejects.toThrow(
      "WEBSOCKET_URL is not defined"
    );
  });

  it("fetches WebSocket ticket", async () => {
    await createAndOpenConnection();
    expect(fetchWebSocketTicket).toHaveBeenCalledTimes(1);
  });

  it("creates WebSocket with correct URL and ticket", async () => {
    await createAndOpenConnection();

    expect(mockWebSocket).toHaveBeenCalledWith(
      "wss://calendar.example.com/ws?ticket=test-ticket-123"
    );
  });

  it("creates WebSocket with correct URL and ticket without the WEBSOCKET_URL", async () => {
    delete window.WEBSOCKET_URL;
    window.CALENDAR_BASE_URL = "https://calendar.example.com";
    await createAndOpenConnection();

    expect(mockWebSocket).toHaveBeenCalledWith(
      "wss://calendar.example.com/ws?ticket=test-ticket-123"
    );
  });

  it("resolves with socket when connection opens", async () => {
    const { socket, ws } = await createAndOpenConnection();
    expect(socket).toBe(ws);
  });

  it("rejects when connection fails", async () => {
    const mockCallbacks = {
      onMessage: jest.fn(),
    };
    const promise = createWebSocketConnection(mockCallbacks);

    await waitFor(() => {
      expect(webSocketInstances.length).toBe(1);
    });

    triggerEvent(getWs(), WS_INBOUND_EVENTS.ERROR, new Event("error"));

    await expect(promise).rejects.toThrow("WebSocket connection failed");
  });

  it("attaches message event listener", async () => {
    const { ws } = await createAndOpenConnection();

    expect(ws._listeners[WS_INBOUND_EVENTS.MESSAGE]).toBeDefined();
    expect(ws._listeners[WS_INBOUND_EVENTS.MESSAGE].length).toBeGreaterThan(0);
  });

  it("attaches close event listener", async () => {
    const { ws } = await createAndOpenConnection();
    expect(ws._listeners[WS_INBOUND_EVENTS.CONNECTION_CLOSED]).toBeDefined();
  });

  it("handles invalid JSON messages", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    const { ws } = await createAndOpenConnection();

    triggerEvent(ws, WS_INBOUND_EVENTS.MESSAGE, { data: "invalid json" });

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to parse WebSocket message:",
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });

  it("rejects on timeout", async () => {
    jest.useFakeTimers();
    const mockCallbacks = {
      onMessage: jest.fn(),
    };
    const promise = createWebSocketConnection(mockCallbacks);

    await waitFor(() => {
      expect(webSocketInstances.length).toBe(1);
    });

    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow("WebSocket connection timed out");

    jest.useRealTimers();
  });

  it("calls onMessage callback when message received", async () => {
    const { ws, mockCallbacks } = await createAndOpenConnection();

    const testMessage = { type: "test", payload: "data" };
    triggerEvent(ws, WS_INBOUND_EVENTS.MESSAGE, {
      data: JSON.stringify(testMessage),
    });

    expect(mockCallbacks.onMessage).toHaveBeenCalledWith(testMessage);
  });

  it("does not call onMessage when JSON parsing fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation();
    const { ws, mockCallbacks } = await createAndOpenConnection();

    triggerEvent(ws, WS_INBOUND_EVENTS.MESSAGE, { data: "invalid json" });

    expect(mockCallbacks.onMessage).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to parse WebSocket message:",
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });

  it("calls onClose callback when connection closes", async () => {
    const { ws, mockCallbacks } = await createAndOpenConnection();

    const closeEvent = new CloseEvent("close", {
      code: 1000,
      reason: "Normal closure",
    });
    triggerEvent(ws, WS_INBOUND_EVENTS.CONNECTION_CLOSED, closeEvent);

    expect(mockCallbacks.onClose).toHaveBeenCalledWith(closeEvent);
  });

  it("calls onError callback when error occurs", async () => {
    const { ws, mockCallbacks } = await createAndOpenConnection();

    const errorEvent = new Event("error");
    triggerEvent(ws, WS_INBOUND_EVENTS.ERROR, errorEvent);

    expect(mockCallbacks.onError).toHaveBeenCalledWith(errorEvent);
  });
});
