/**
 * Vitest runs in UTC (see vitest.config.ts). Make Date#getDay answer as a browser
 * five hours west of UTC (New York in winter) would: midnight UTC is still
 * the day before there.
 */
import type { MockInstance } from 'vitest'
export function mockBrowserWestOfUtc(): MockInstance {
  return vi.spyOn(Date.prototype, 'getDay').mockImplementation(function (
    this: Date
  ) {
    return new Date(this.getTime() - 5 * 60 * 60 * 1000).getUTCDay()
  })
}
