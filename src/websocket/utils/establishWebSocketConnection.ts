import {
  createWebSocketConnection,
  WebSocketCallbacks,
  WebSocketWithCleanup,
} from "../createWebSocketConnection";

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
