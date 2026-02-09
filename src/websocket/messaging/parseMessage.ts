import { WS_INBOUND_EVENTS } from "../protocols";

export function parseMessage(message: unknown) {
  const calendarsToRefresh = new Set<string>();
  const calendarsToHide = new Set<string>();
  if (typeof message !== "object" || message === null) {
    return { calendarsToRefresh, calendarsToHide };
  }

  for (const [key, value] of Object.entries(message)) {
    switch (key) {
      case WS_INBOUND_EVENTS.CLIENT_REGISTERED:
        if (Array.isArray(value)) {
          value.forEach((cal: string) => calendarsToRefresh.add(cal));
        }
        break;
      case WS_INBOUND_EVENTS.CLIENT_UNREGISTERED:
        if (Array.isArray(value)) {
          value.forEach((cal: string) => calendarsToHide.add(cal));
        }
        break;
      case WS_INBOUND_EVENTS.CALENDAR_CLIENT_REGISTERED:
        break;
      default: {
        calendarsToRefresh.add(key);
      }
    }
  }

  return { calendarsToRefresh, calendarsToHide };
}
