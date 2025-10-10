import "@testing-library/jest-dom";

import { TextEncoder } from "util";

global.TextEncoder = TextEncoder;

// Set timezone to UTC for consistent test results across all environments
process.env.TZ = "UTC";

// Mock Intl.DateTimeFormat to use UTC timezone by default
const OriginalDateTimeFormat = Intl.DateTimeFormat;

// Create a constructor function that preserves prototype
const MockedDateTimeFormat: any = function (
  this: any,
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions
) {
  // Only set timeZone to UTC if not explicitly specified
  const modifiedOptions = options
    ? { timeZone: "UTC", ...options } // timeZone comes first so options can override it
    : { timeZone: "UTC" };
  return new OriginalDateTimeFormat(locales, modifiedOptions);
};

// Preserve the prototype so jest.spyOn works on methods
MockedDateTimeFormat.prototype = OriginalDateTimeFormat.prototype;

// Preserve static methods
Object.setPrototypeOf(MockedDateTimeFormat, OriginalDateTimeFormat);

global.Intl.DateTimeFormat = MockedDateTimeFormat;

jest.mock("openid-client", () => ({
  discovery: jest.fn(),
  randomPKCECodeVerifier: jest.fn(),
  calculatePKCECodeChallenge: jest.fn(),
  randomState: jest.fn(),
  buildAuthorizationUrl: jest.fn(),
  buildEndSessionUrl: jest.fn(),
  authorizationCodeGrant: jest.fn(),
  fetchUserInfo: jest.fn(),
}));
const originalWarn = console.warn;

beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("React Router Future Flag Warning")
    ) {
      return;
    }
    originalWarn(...args);
  };
});
