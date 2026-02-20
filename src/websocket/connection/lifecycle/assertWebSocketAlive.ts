// connection/lifecycle/assertWebSocketAlive.ts

import type { WebSocketWithCleanup } from "../types";
import { getWebSocketState } from "../webSocketState";

const TIMEOUT_MS = window.WS_PING_TIMEOUT_PERIOD_MS;

function waitForSocketOpen(
  socketRef: React.MutableRefObject<WebSocketWithCleanup | null>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + TIMEOUT_MS;

    const poll = () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) return resolve();
      if (Date.now() >= deadline)
        return reject(new Error("[WS] Timed out waiting for reconnection"));
      setTimeout(poll, 100);
    };

    poll();
  });
}

export function assertWebSocketAlive(): Promise<void> {
  const { socketRef, triggerReconnect, isConnecting } = getWebSocketState();

  // Not registered yet or mid-bootstrap — don't interfere, don't block
  if (!socketRef || isConnecting || !triggerReconnect) return Promise.resolve();

  const socket = socketRef.current;

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    // Already trying to connect — just wait for it, don't trigger another reconnect
    triggerReconnect();
    return waitForSocketOpen(socketRef);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      console.warn("[WS] Pong not received — triggering reconnect");
      triggerReconnect();
      waitForSocketOpen(socketRef).then(resolve);
    }, TIMEOUT_MS);

    const handlePong = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg) {
          cleanup();
          resolve();
        }
      } catch {
        // not parseable, keep waiting
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeEventListener("message", handlePong);
    };

    socket.addEventListener("message", handlePong);
    socket.send(JSON.stringify({ type: "ping" }));
  });
}
