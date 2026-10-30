import '@testing-library/jest-dom/vitest'

import { TextEncoder } from 'util'

global.TextEncoder = TextEncoder

// Set timezone to UTC for consistent test results across all environments
process.env.TZ = 'UTC'

// Mock Intl.DateTimeFormat to use UTC timezone by default
const OriginalDateTimeFormat = Intl.DateTimeFormat

// Create a constructor function that preserves prototype
const MockedDateTimeFormat: any = function (
  this: any,
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions
) {
  // Only set timeZone to UTC if not explicitly specified
  const modifiedOptions = options
    ? { timeZone: 'UTC', ...options } // timeZone comes first so options can override it
    : { timeZone: 'UTC' }
  return new OriginalDateTimeFormat(locales, modifiedOptions)
}

// Preserve the prototype so vi.spyOn works on methods
MockedDateTimeFormat.prototype = OriginalDateTimeFormat.prototype

// Preserve static methods
Object.setPrototypeOf(MockedDateTimeFormat, OriginalDateTimeFormat)

global.Intl.DateTimeFormat = MockedDateTimeFormat

vi.mock('openid-client', () => ({
  discovery: vi.fn(),
  randomPKCECodeVerifier: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
  randomState: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  buildEndSessionUrl: vi.fn(),
  authorizationCodeGrant: vi.fn(),
  fetchUserInfo: vi.fn(),
  clockSkew: Symbol('clockSkew')
}))
const originalWarn = console.warn

// Testing Library detects fake timers through a global `jest`, and advances
// them with it while it polls in `waitFor`. Without this global, `waitFor` would
// wait for fake timers that nothing advances, until the test times out.
;(globalThis as any).jest = {
  advanceTimersByTime: vi.advanceTimersByTime.bind(vi)
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

;(global as any).IntersectionObserver = IntersectionObserverMock
if (typeof window !== 'undefined') {
  window.WS_PING_PERIOD_MS = 5000
  window.WS_PING_TIMEOUT_PERIOD_MS = 5000
}
vi.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: vi.fn(() => ({ isMobile: false, isTablet: false }))
}))
// Suppress jsdom CSS selector parsing errors for Emotion/MUI
if (typeof window !== 'undefined' && window.getComputedStyle) {
  // Called with .call(this) below
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = function (
    element: Element,
    pseudoElement?: string | null
  ) {
    try {
      return originalGetComputedStyle.call(this, element, pseudoElement)
    } catch (error) {
      // If CSS selector parsing fails, return a minimal computed style
      if (
        error instanceof Error &&
        error.message.includes('is not a valid selector')
      ) {
        return {
          getPropertyValue: () => ''
        } as CSSStyleDeclaration
      }
      throw error
    }
  }
}

beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('React Router Future Flag Warning')
    ) {
      return
    }
    originalWarn(...args)
  }
})
