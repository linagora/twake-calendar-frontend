import { waitFor } from "@testing-library/dom";
import { fetchWebSocketTicket } from "../../../src/websocket/api/fetchWebSocketTicket";
import { createWebSocketConnection } from "../../../src/websocket/createWebSocketConnection";
import { WS_INBOUND_EVENTS } from "../../../src/websocket/protocols";
import { parseMessage } from "../../../src/websocket/ws/parseMessage";
import { setupWebsocket } from "./utils/setupWebsocket";

jest.mock("../../../src/websocket/api/fetchWebSocketTicket");
jest.mock("../../../src/websocket/ws/parseMessage");

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
    const mockDispatch = jest.fn();
    const promise = createWebSocketConnection(mockDispatch);

    await waitFor(() => {
      expect(webSocketInstances.length).toBe(1);
    });

    triggerEvent(getWs(), WS_INBOUND_EVENTS.CONNECTION_OPENED);
    const socket = await promise;

    return { socket, ws: getWs(), promise, mockDispatch };
  };

  /** ---------- Setup ---------- */

  beforeEach(() => {
    ({ webSocketInstances, mockWebSocket, cleanup } = setupWebsocket());
    (window as any).WEBSOCKET_URL = "wss://calendar.example.com";

    (fetchWebSocketTicket as jest.Mock).mockResolvedValue(mockTicket);
    (parseMessage as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete (window as any).WEBSOCKET_URL;
    delete (window as any).CALENDAR_BASE_URL;
    cleanup();
  });

  /** ---------- Tests ---------- */

  it("throws when WEBSOCKET_URL is not defined", async () => {
    delete (window as any).WEBSOCKET_URL;
    const mockDispatch = jest.fn();

    await expect(createWebSocketConnection(mockDispatch)).rejects.toThrow(
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
    delete (window as any).WEBSOCKET_URL;
    (window as any).CALENDAR_BASE_URL = "https://calendar.example.com";
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
    const mockDispatch = jest.fn();
    const promise = createWebSocketConnection(mockDispatch);

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

  it("parses and logs incoming messages", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation();

    const { ws, mockDispatch } = await createAndOpenConnection();

    const testMessage = { type: "test", payload: "data" };
    triggerEvent(ws, WS_INBOUND_EVENTS.MESSAGE, {
      data: JSON.stringify(testMessage),
    });

    expect(logSpy).toHaveBeenCalledWith(
      "WebSocket message received:",
      testMessage
    );
    expect(parseMessage).toHaveBeenCalledWith(testMessage, mockDispatch);

    logSpy.mockRestore();
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

  it("calls parseMessage with dispatch when valid message received", async () => {
    const { ws, mockDispatch } = await createAndOpenConnection();

    const testMessage = { registered: ["/calendars/cal1"] };
    triggerEvent(ws, WS_INBOUND_EVENTS.MESSAGE, {
      data: JSON.stringify(testMessage),
    });

    expect(parseMessage).toHaveBeenCalledWith(testMessage, mockDispatch);
  });

  it("does not call parseMessage when JSON parsing fails", async () => {
    jest.spyOn(console, "error").mockImplementation();
    const { ws } = await createAndOpenConnection();

    triggerEvent(ws, WS_INBOUND_EVENTS.MESSAGE, { data: "invalid json" });

    expect(parseMessage).not.toHaveBeenCalled();
  });
});
