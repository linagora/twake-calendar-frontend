import { WS_INBOUND_EVENTS } from '@common/websocket/protocols'

export function parseMessage(message: unknown) {
  const calendarsToRefresh = new Set<string>()
  const calendarsToHide = new Set<string>()
  let shouldRefreshCalendarList = false
  let shouldRefreshBookingLinks = false
  if (typeof message !== 'object' || message === null) {
    return {
      calendarsToRefresh,
      calendarsToHide,
      shouldRefreshCalendarList,
      shouldRefreshBookingLinks
    }
  }

  for (const [key, value] of Object.entries(message)) {
    switch (key) {
      case WS_INBOUND_EVENTS.CLIENT_REGISTERED:
        if (Array.isArray(value)) {
          value.forEach((cal: string) => calendarsToRefresh.add(cal))
        }
        break
      case WS_INBOUND_EVENTS.CLIENT_UNREGISTERED:
        if (Array.isArray(value)) {
          value.forEach((cal: string) => calendarsToHide.add(cal))
        }
        break
      case WS_INBOUND_EVENTS.CALENDAR_CLIENT_REGISTERED:
        break
      case WS_INBOUND_EVENTS.CALENDAR_LIST:
        Object.keys(value).forEach(key => {
          if (key === 'subscribed') {
            if (Array.isArray(value[key])) {
              value[key].forEach((cal: string) => calendarsToRefresh.add(cal))
            }
          } else if (key === 'deleted') {
            shouldRefreshCalendarList = true
          } else {
            shouldRefreshCalendarList = true
          }
        })
        break
      case WS_INBOUND_EVENTS.BOOKING_LINK_STATE_CHANGED:
        shouldRefreshBookingLinks = true
        break
      default: {
        calendarsToRefresh.add(key)
      }
    }
  }

  return {
    calendarsToRefresh,
    calendarsToHide,
    shouldRefreshCalendarList,
    shouldRefreshBookingLinks
  }
}
