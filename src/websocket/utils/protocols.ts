// WebSocket event listeners (browser events)
export const WS_INBOUND_EVENTS = {
  CONNECTION_OPENED: "open",
  MESSAGE: "message",
  ERROR: "error",
  CONNECTION_CLOSED: "close",
} as const;

// WebSocket message types sent to server
export const WS_OUTBOUND_EVENTS = {
  REGISTER_CLIENT: "registered",
  UNREGISTER_CLIENT: "unregistered",
} as const;
