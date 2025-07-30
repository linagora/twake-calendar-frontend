import "@testing-library/jest-dom";

import { TextEncoder, TextDecoder } from "util";
import { clientConfig } from "./features/User/oidcAuth";

global.TextEncoder = TextEncoder;

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
