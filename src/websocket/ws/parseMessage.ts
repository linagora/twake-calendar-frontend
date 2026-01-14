import { WS_OUTBOUND_EVENTS } from "../utils/protocols";

export function parseMessage(message: unknown) {
  console.log("WebSocket message received:", message);
  const calendarsToRefresh = new Set<string>();
  if (typeof message !== "object" || message === null) {
    return calendarsToRefresh;
  }

  for (const [key, value] of Object.entries(message)) {
    switch (key) {
      case WS_OUTBOUND_EVENTS.REGISTER_CLIENT:
        value.forEach((cal: string) => calendarsToRefresh.add(cal));
        break;
      case WS_OUTBOUND_EVENTS.UNREGISTER_CLIENT:
        console.log("Unregistered Calendar", value);
        break;
      default: {
        calendarsToRefresh.add(key);
      }
    }
  }

  return calendarsToRefresh;
}
