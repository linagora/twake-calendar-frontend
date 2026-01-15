import { WS_INBOUND_EVENTS } from "../protocols";

export function parseMessage(message: unknown) {
  console.log("WebSocket message received:", message);
  const calendarsToRefresh = new Set<string>();
  if (typeof message !== "object" || message === null) {
    return calendarsToRefresh;
  }

  for (const [key, value] of Object.entries(message)) {
    switch (key) {
      case WS_INBOUND_EVENTS.CLIENT_REGISTERED:
        if (Array.isArray(value)) {
          value.forEach((cal: string) => calendarsToRefresh.add(cal));
        }
        break;
      case WS_INBOUND_EVENTS.CLIENT_UNREGISTERED:
        console.log("Unregistered Calendar", value);
        break;
      default: {
        calendarsToRefresh.add(key);
      }
    }
  }

  return calendarsToRefresh;
}
