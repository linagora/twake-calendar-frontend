import { WebSocketWithCleanup } from "../types";

export interface PingConfig {
  /** Interval between ping attempts in milliseconds */
  pingInterval?: number;
  /** Timeout for pong response in milliseconds */
  pongTimeout?: number;
  /** Callback when connection is deemed dead */
  onConnectionDead?: () => void;
  /** Callback when ping fails */
  onPingFail?: () => void;
  /** Callback when pong is received successfully */
  onPongReceived?: () => void;
}

export interface PingCleanup {
  stop: () => void;
  /** Force send a ping immediately */
  sendPing: () => void;
}

const DEFAULT_PING_INTERVAL = (window as any).WS_PING_PERIOD_MS;
const DEFAULT_PONG_TIMEOUT = (window as any).WS_PING_TIMEOUT_PERIOD_MS;

/**
 * Sets up a ping/pong mechanism to monitor WebSocket connection health
 *
 * @param socket - The WebSocket connection to monitor
 * @param config - Configuration options for ping behavior
 * @returns Cleanup object with stop() and sendPing() methods
 *
 * @example
 * const pingCleanup = setupWebSocketPing(socket, {
 *   pingInterval: 30000,
 *   pongTimeout: 5000,
 *   onConnectionDead: () => {
 *     console.log('Connection is dead, reconnecting...');
 *     reconnect();
 *   }
 * });
 *
 * // Later, when closing the connection:
 * pingCleanup.stop();
 */
export function setupWebSocketPing(
  socket: WebSocketWithCleanup | null,
  config: PingConfig = {}
): PingCleanup {
  const {
    pingInterval = DEFAULT_PING_INTERVAL,
    pongTimeout = DEFAULT_PONG_TIMEOUT,
    onConnectionDead,
    onPingFail,
    onPongReceived,
  } = config;

  let pingIntervalId: NodeJS.Timeout | null = null;
  let pongTimeoutId: NodeJS.Timeout | null = null;
  let isWaitingForPong = false;
  let isStopped = false;

  const cleanup = () => {
    if (pingIntervalId) {
      clearInterval(pingIntervalId);
      pingIntervalId = null;
    }
    if (pongTimeoutId) {
      clearTimeout(pongTimeoutId);
      pongTimeoutId = null;
    }
    isWaitingForPong = false;
  };

  const sendPing = () => {
    if (isStopped || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // If we're still waiting for a previous pong, connection might be dead
    if (isWaitingForPong) {
      console.warn(
        "Pong not received for previous ping. Connection may be dead."
      );
      onPingFail?.();
      onConnectionDead?.();
      cleanup();
      return;
    }

    try {
      // Send a ping frame (WebSocket protocol-level ping)
      // Most WebSocket implementations handle this automatically
      // If your server expects a custom ping message, modify this:
      socket.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));

      isWaitingForPong = true;

      // Set timeout for pong response
      pongTimeoutId = setTimeout(() => {
        if (isWaitingForPong) {
          console.warn("Pong timeout exceeded. Connection may be dead.");
          onPingFail?.();
          onConnectionDead?.();
          cleanup();
        }
      }, pongTimeout);
    } catch (error) {
      console.error("Failed to send ping:", error);
      onPingFail?.();
      cleanup();
    }
  };

  const handlePong = () => {
    if (pongTimeoutId) {
      clearTimeout(pongTimeoutId);
      pongTimeoutId = null;
    }
    isWaitingForPong = false;
    onPongReceived?.();
  };

  // Start ping interval
  const startPinging = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("Cannot start pinging: socket is not open");
      return;
    }

    // Send first ping immediately
    sendPing();

    // Set up recurring pings
    pingIntervalId = setInterval(() => {
      sendPing();
    }, pingInterval);
  };

  // Set up message listener for pong responses
  const originalOnMessage = socket?.onmessage;
  if (socket) {
    socket.onmessage = (event) => {
      let isPong = false;
      if (typeof event.data === "string") {
        try {
          const payload = JSON.parse(event.data);
          // Check if it's an empty object {}
          isPong =
            typeof payload === "object" &&
            payload !== null &&
            Object.keys(payload).length === 0;
        } catch {
          // Non-JSON payload
        }
      }
      if (isPong) {
        handlePong();
      }
      // Call original handler
      originalOnMessage?.call(socket, event);
    };
  }

  // Start the ping mechanism
  startPinging();

  return {
    stop: () => {
      isStopped = true;
      cleanup();
      // Restore original onmessage handler
      if (socket) {
        socket.onmessage = originalOnMessage ?? null;
      }
    },
    sendPing: () => {
      if (!isStopped) {
        sendPing();
      }
    },
  };
}
