export const WS_INBOUND_EVENTS = {
  CONNECTION_OPENED: "open",
  MESSAGE: "message",
  ERROR: "error",
  CONNECTION_CLOSED: "close",
  CLIENT_REGISTERED: "registered",
  CLIENT_UNREGISTERED: "unregistered",
  CALENDAR_CLIENT_REGISTERED: "calendarListRegistered",
  CALENDAR_LIST: "calendarList",
} as const;
