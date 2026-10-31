import { WS_INBOUND_EVENTS } from '@common/websocket/protocols'

function addCalendarPaths(paths: unknown[], target: Set<string>): void {
  paths
    .filter((path): path is string => typeof path === 'string')
    .forEach(path => target.add(path))
}

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
          addCalendarPaths(value, calendarsToRefresh)
        }
        break
      case WS_INBOUND_EVENTS.CLIENT_UNREGISTERED:
        if (Array.isArray(value)) {
          addCalendarPaths(value, calendarsToHide)
        }
        break
      case WS_INBOUND_EVENTS.CALENDAR_CLIENT_REGISTERED:
        break
      case WS_INBOUND_EVENTS.CALENDAR_LIST:
        if (value === null) {
          break
        }
        Object.keys(value).forEach(key => {
          if (key === 'subscribed') {
            if (Array.isArray(value[key])) {
              addCalendarPaths(value[key], calendarsToRefresh)
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
