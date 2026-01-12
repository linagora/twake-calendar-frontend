import { fetchWebSocketTicket } from "./api/fetchWebSocketTicket";
import { WS_INBOUND_EVENTS } from "./protocols";

export async function createWebSocketConnection(): Promise<WebSocket> {
  const wsBaseUrl =
    (window as any).WEBSOCKET_URL ??
    (window as any).CALENDAR_BASE_URL?.replace(/^https:/, "wss:") ??
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

  socket.addEventListener(WS_INBOUND_EVENTS.MESSAGE, (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("WebSocket message received:", message);

      // TODO: Handle different message types
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  });

  socket.addEventListener(WS_INBOUND_EVENTS.CONNECTION_CLOSED, (event) => {
    console.log("WebSocket closed:", event.code, event.reason);
    // TODO: Add reconnection logic
  });

  socket.addEventListener(WS_INBOUND_EVENTS.ERROR, (error) => {
    console.error("WebSocket error:", error);
  });

  return socket;
}
