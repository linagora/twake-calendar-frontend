import { parseMessage } from '@common/websocket/messaging/parseMessage'
import { WS_INBOUND_EVENTS } from '@common/websocket/protocols'

describe('parseMessage', () => {
  it('should return empty set for non-object messages', () => {
    const result1 = parseMessage(null)
    const result2 = parseMessage('string')
    const result3 = parseMessage(123)

    expect(result1.calendarsToRefresh).toEqual(new Set<string>())
    expect(result2.calendarsToRefresh).toEqual(new Set<string>())
    expect(result3.calendarsToRefresh).toEqual(new Set<string>())
  })

  it('should handle registered event', () => {
    const message = {
      [WS_INBOUND_EVENTS.CLIENT_REGISTERED]: [
        '/calendars/cal1/entry1',
        '/calendars/cal2/entry2'
      ]
    }

    const result = parseMessage(message)

    expect(result.calendarsToRefresh).toContain('/calendars/cal1/entry1')
    expect(result.calendarsToRefresh).toContain('/calendars/cal2/entry2')
    expect(result.calendarsToRefresh.size).toBe(2)
  })

  it('should handle unregistered event', () => {
    const message = {
      [WS_INBOUND_EVENTS.CLIENT_UNREGISTERED]: ['/calendars/cal1/entry1']
    }

    const result = parseMessage(message)

    expect(result.calendarsToHide).toContain('/calendars/cal1/entry1')
  })

  it('should handle calendar path updates', () => {
    const message = {
      '/calendars/cal1/entry1': { updated: true }
    }

    const result = parseMessage(message)

    expect(result.calendarsToRefresh).toContain('/calendars/cal1/entry1')
    expect(result.calendarsToRefresh.size).toBe(1)
  })

  it('should parse multiple calendar paths', () => {
    const message = {
      '/calendars/cal1/entry1': {},
      '/calendars/cal2/entry2': {}
    }

    const result = parseMessage(message)

    expect(result.calendarsToRefresh.size).toBe(2)
    expect(result.calendarsToRefresh).toContain('/calendars/cal1/entry1')
    expect(result.calendarsToRefresh).toContain('/calendars/cal2/entry2')
  })

  it('should handle multiple event types in single message', () => {
    const message = {
      [WS_INBOUND_EVENTS.CLIENT_REGISTERED]: ['/calendars/cal1/entry1'],
      [WS_INBOUND_EVENTS.CLIENT_UNREGISTERED]: ['/calendars/cal2/entry2'],
      '/calendars/cal1/entry1': {}
    }

    const result = parseMessage(message)

    expect(result.calendarsToRefresh.size).toBe(1)
    expect(result.calendarsToRefresh).toContain('/calendars/cal1/entry1')
  })

  it('should handle bookingLinkStateChanged event', () => {
    const message = {
      [WS_INBOUND_EVENTS.BOOKING_LINK_STATE_CHANGED]: true
    }

    const result = parseMessage(message)

    expect(result.shouldRefreshBookingLinks).toBe(true)
    expect(result.calendarsToRefresh.size).toBe(0)
    expect(result.calendarsToHide.size).toBe(0)
  })

  it('should handle bookingLinkStateChanged with other events', () => {
    const message = {
      [WS_INBOUND_EVENTS.BOOKING_LINK_STATE_CHANGED]: true,
      [WS_INBOUND_EVENTS.CLIENT_REGISTERED]: ['/calendars/cal1/entry1']
    }

    const result = parseMessage(message)

    expect(result.shouldRefreshBookingLinks).toBe(true)
    expect(result.calendarsToRefresh.size).toBe(1)
    expect(result.calendarsToRefresh).toContain('/calendars/cal1/entry1')
  })

  it('should keep only string calendar paths', () => {
    const { calendarsToRefresh, calendarsToHide } = parseMessage({
      [WS_INBOUND_EVENTS.CLIENT_REGISTERED]: [
        ['/calendars/a/a'],
        42,
        null,
        '/calendars/u1/c1'
      ],
      [WS_INBOUND_EVENTS.CLIENT_UNREGISTERED]: [
        { toString: {} },
        '/calendars/u2/c2'
      ],
      [WS_INBOUND_EVENTS.CALENDAR_LIST]: {
        subscribed: [{ id: 'x' }, '/calendars/u3/c3']
      }
    })

    expect(calendarsToRefresh).toEqual(
      new Set(['/calendars/u1/c1', '/calendars/u3/c3'])
    )
    expect(calendarsToHide).toEqual(new Set(['/calendars/u2/c2']))
  })

  it('should ignore a null calendar list', () => {
    const result = parseMessage({ [WS_INBOUND_EVENTS.CALENDAR_LIST]: null })

    expect(result.calendarsToRefresh.size).toBe(0)
    expect(result.shouldRefreshCalendarList).toBe(false)
  })
})
