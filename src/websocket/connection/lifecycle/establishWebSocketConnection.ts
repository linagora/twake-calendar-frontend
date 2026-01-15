import { createWebSocketConnection } from "../createConnection";
import { WebSocketCallbacks, WebSocketWithCleanup } from "../types";

export async function establishWebSocketConnection(
  callbacks: WebSocketCallbacks,
  socketRef: React.MutableRefObject<WebSocketWithCleanup | null>,
  setIsSocketOpen: (value: boolean) => void,
  signal?: AbortSignal
) {
  try {
    const socket = await createWebSocketConnection(callbacks);

    if (signal?.aborted) {
      socket.cleanup();
      socket.close();
      return;
    }

    socketRef.current = socket;

    if (socket.readyState === WebSocket.OPEN) {
      setIsSocketOpen(true);
    }
  } catch (error) {
    console.error("Failed to create WebSocket connection:", error);
    setIsSocketOpen(false);
  }
}
