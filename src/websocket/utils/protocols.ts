// WebSocket event listeners (browser events)
export const WS_INBOUND_EVENTS = {
  CONNECTION_OPENED: "open",
  MESSAGE: "message",
  ERROR: "error",
  CONNECTION_CLOSED: "close",
  CLIENT_REGISTERED: "registered",
  CLIENT_UNREGISTERED: "unregistered",
} as const;

// WebSocket message types sent to server
export const WS_OUTBOUND_EVENTS = {} as const;
