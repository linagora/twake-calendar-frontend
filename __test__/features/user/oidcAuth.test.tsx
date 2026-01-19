// __tests__/auth.test.ts
import {
  Auth,
  Callback,
  clientConfig,
  getClientConfig,
  Logout,
} from "@/features/User/oidcAuth";
import * as apiUtils from "@/utils/apiUtils";
import * as client from "openid-client";

clientConfig.url = "https://example.com";
const localAdress = "https://local.exemple.com";

describe("OpenID Client Auth Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(apiUtils, "getLocation").mockImplementation(() => localAdress);
  });

  describe("getClientConfig", () => {
    it("should call discovery with clientConfig.url", async () => {
      const discoveryMock = client.discovery as jest.Mock;
      discoveryMock.mockResolvedValue("discoveredClient");

      const result = await getClientConfig();

      expect(discoveryMock).toHaveBeenCalledWith(
        new URL(clientConfig.url),
        clientConfig.client_id
      );
      expect(result).toBe("discoveredClient");
    });
  });

  describe("Auth", () => {
    it("should generate PKCE and build authorization URL with PKCE", async () => {
      (client.randomPKCECodeVerifier as jest.Mock).mockReturnValue(
        "verifier123"
      );
      (client.calculatePKCECodeChallenge as jest.Mock).mockResolvedValue(
        "challenge123"
      );

      // Mock discovery returning an object with serverMetadata()
      const discoveredClient = {
        serverMetadata: jest.fn(() => ({
          supportsPKCE: () => true,
        })),
      };
      (client.discovery as jest.Mock).mockResolvedValue(discoveredClient);

      (client.buildAuthorizationUrl as jest.Mock).mockReturnValue(
        "https://auth.url"
      );

      const result = await Auth();

      expect(client.randomPKCECodeVerifier).toHaveBeenCalled();
      expect(client.calculatePKCECodeChallenge).toHaveBeenCalledWith(
        "verifier123"
      );
      expect(client.buildAuthorizationUrl).toHaveBeenCalledWith(
        discoveredClient,
        expect.objectContaining({
          code_challenge: "challenge123",
          code_challenge_method: clientConfig.code_challenge_method,
          redirect_uri: clientConfig.redirect_uri,
          scope: clientConfig.scope,
        })
      );
      expect(result).toEqual({
        redirectTo: "https://auth.url",
        code_verifier: "verifier123",
        state: undefined,
      });
    });

    it("should generate state when PKCE not supported", async () => {
      (client.randomPKCECodeVerifier as jest.Mock).mockReturnValue(
        "verifier123"
      );
      (client.calculatePKCECodeChallenge as jest.Mock).mockResolvedValue(
        "challenge123"
      );

      const discoveredClient = {
        serverMetadata: jest.fn(() => ({
          supportsPKCE: () => false,
        })),
      };
      (client.discovery as jest.Mock).mockResolvedValue(discoveredClient);
      (client.randomState as jest.Mock).mockReturnValue("state123");
      (client.buildAuthorizationUrl as jest.Mock).mockReturnValue(
        "https://auth.url"
      );

      const result = await Auth();

      expect(client.randomState).toHaveBeenCalled();
      expect(result.state).toBe("state123");
      expect(result.redirectTo).toBe("https://auth.url");
    });
  });

  describe("Logout", () => {
    it("should build end session URL", async () => {
      const discoveredClient = {};
      (client.discovery as jest.Mock).mockResolvedValue(discoveredClient);
      (client.buildEndSessionUrl as jest.Mock).mockReturnValue(
        "https://logout.url"
      );

      const result = await Logout();

      expect(client.buildEndSessionUrl).toHaveBeenCalledWith(discoveredClient, {
        post_logout_redirect_uri: clientConfig.post_logout_redirect_uri,
      });
      expect(result).toBe("https://logout.url");
    });
  });

  describe("Callback", () => {
    it("should perform authorization code grant and fetch user info", async () => {
      const discoveredClient = {};
      (client.discovery as jest.Mock).mockResolvedValue(discoveredClient);

      const mockTokenSet = {
        access_token: "access123",
        claims: jest.fn(() => ({ sub: "user123" })),
      };
      (client.authorizationCodeGrant as jest.Mock).mockResolvedValue(
        mockTokenSet
      );
      (client.fetchUserInfo as jest.Mock).mockResolvedValue({ name: "User" });
      const result = await Callback("verifier123", "state123");

      expect(client.authorizationCodeGrant).toHaveBeenCalledWith(
        discoveredClient,
        new URL(localAdress),
        { pkceCodeVerifier: "verifier123", expectedState: "state123" }
      );

      expect(client.fetchUserInfo).toHaveBeenCalledWith(
        discoveredClient,
        "access123",
        "user123"
      );

      expect(result).toEqual({
        tokenSet: mockTokenSet,
        userinfo: { name: "User" },
      });
    });

    it("should catch and log errors", async () => {
      const error = new Error("fail");
      (client.discovery as jest.Mock).mockResolvedValue({});
      (client.authorizationCodeGrant as jest.Mock).mockRejectedValue(error);
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await Callback("verifier", "state");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Token grant error:", error);
      expect(result).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });
  });
});
