import { fetchWebSocketTicket } from "../api/fetchWebSocketTicket";
import { WS_INBOUND_EVENTS } from "../protocols";
import { WebSocketCallbacks, WebSocketWithCleanup } from "./types";

export async function createWebSocketConnection(
  callbacks: WebSocketCallbacks
): Promise<WebSocketWithCleanup> {
  const wsBaseUrl =
    (window as any).WEBSOCKET_URL ??
    (window as any).CALENDAR_BASE_URL?.replace(
      /^http(s)?:/,
      (_: string, s: string | undefined) => (s ? "wss:" : "ws:")
    ) ??
    "";

  if (!wsBaseUrl) {
    throw new Error("WEBSOCKET_URL is not defined");
  }

  const ticket = await fetchWebSocketTicket();

  const socket = new WebSocket(
    `${wsBaseUrl}/ws?ticket=${encodeURIComponent(ticket.value)}`
  );

  const CONNECTION_TIMEOUT_MS = 10_000;

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.removeEventListener(
        WS_INBOUND_EVENTS.CONNECTION_OPENED,
        openHandler
      );
      socket.removeEventListener(WS_INBOUND_EVENTS.ERROR, errorHandler);
      socket.close();
      reject(new Error("WebSocket connection timed out"));
    }, CONNECTION_TIMEOUT_MS);

    const openHandler = () => {
      console.log("WebSocket connection opened");
      clearTimeout(timeoutId);
      socket.removeEventListener(
        WS_INBOUND_EVENTS.CONNECTION_OPENED,
        openHandler
      );
      socket.removeEventListener(WS_INBOUND_EVENTS.ERROR, errorHandler);
      resolve();
    };

    const errorHandler = (error: Event) => {
      console.error("WebSocket connection failed:", error);
      clearTimeout(timeoutId);
      socket.removeEventListener(
        WS_INBOUND_EVENTS.CONNECTION_OPENED,
        openHandler
      );
      socket.removeEventListener(WS_INBOUND_EVENTS.ERROR, errorHandler);
      reject(new Error("WebSocket connection failed"));
    };

    socket.addEventListener(WS_INBOUND_EVENTS.CONNECTION_OPENED, openHandler);
    socket.addEventListener(WS_INBOUND_EVENTS.ERROR, errorHandler);
  });

  // Store references to event handlers so they can be cleaned up later
  const messageHandler = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      callbacks.onMessage(message);
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  };

  const closeHandler = (event: CloseEvent) => {
    console.log("WebSocket closed:", event.code, event.reason);
    cleanup();
    callbacks.onClose?.(event);
  };

  const errorHandler = (error: Event) => {
    console.error("WebSocket error:", error);
    callbacks.onError?.(error);
  };

  // Cleanup function to remove all event listeners
  const cleanup = () => {
    socket.removeEventListener(WS_INBOUND_EVENTS.MESSAGE, messageHandler);
    socket.removeEventListener(
      WS_INBOUND_EVENTS.CONNECTION_CLOSED,
      closeHandler
    );
    socket.removeEventListener(WS_INBOUND_EVENTS.ERROR, errorHandler);
  };

  socket.addEventListener(WS_INBOUND_EVENTS.MESSAGE, messageHandler);
  socket.addEventListener(WS_INBOUND_EVENTS.CONNECTION_CLOSED, closeHandler);
  socket.addEventListener(WS_INBOUND_EVENTS.ERROR, errorHandler);

  // Attach cleanup method to socket
  const socketWithCleanup = socket as WebSocketWithCleanup;
  socketWithCleanup.cleanup = cleanup;

  return socketWithCleanup;
}
