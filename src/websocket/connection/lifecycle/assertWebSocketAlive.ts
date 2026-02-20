import { type MutableRefObject } from "react";
import type { WebSocketWithCleanup } from "../types";
import { getWebSocketState } from "../webSocketState";

const TIMEOUT_MS = window.WS_PING_TIMEOUT_PERIOD_MS ?? 10_000;
let inFlightCheck: Promise<void> | null = null;

function waitForSocketOpen(
  socketRef: MutableRefObject<WebSocketWithCleanup | null>
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
  if (inFlightCheck) return inFlightCheck;
  const { socketRef, triggerReconnect, isConnecting } = getWebSocketState();

  // Not registered yet or mid-bootstrap — don't interfere, don't block
  if (!socketRef || isConnecting || !triggerReconnect) return Promise.resolve();

  const socket = socketRef.current;

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    triggerReconnect();
    return waitForSocketOpen(socketRef);
  }

  const promise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      console.warn("[WS] Pong not received — triggering reconnect");
      triggerReconnect();
      waitForSocketOpen(socketRef).then(resolve, reject);
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
  }).finally(() => {
    inFlightCheck = null;
  });
  inFlightCheck = promise;
  return promise;
}
