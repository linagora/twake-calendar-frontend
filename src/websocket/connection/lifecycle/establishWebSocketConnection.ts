import { createWebSocketConnection } from "../createConnection";
import { WebSocketCallbacks, WebSocketWithCleanup } from "../types";

export async function establishWebSocketConnection(
  callbacks: WebSocketCallbacks,
  socketRef: React.MutableRefObject<WebSocketWithCleanup | null>,
  setIsSocketOpen: (value: boolean) => void
) {
  try {
    const socket = await createWebSocketConnection(callbacks);
    socketRef.current = socket;

    if (socket.readyState === WebSocket.OPEN) {
      setIsSocketOpen(true);
    }
  } catch (error) {
    console.error("Failed to create WebSocket connection:", error);
  }
}
