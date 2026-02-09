import { getLocation } from "@/utils/apiUtils";
import * as client from "openid-client";

export const clientConfig = {
  url: window.SSO_BASE_URL ?? "",
  client_id: window.SSO_CLIENT_ID ?? "",
  scope: window.SSO_SCOPE ?? "",
  redirect_uri: window.SSO_REDIRECT_URI ?? "",
  response_type: window.SSO_RESPONSE_TYPE ?? "",
  code_challenge_method: window.SSO_CODE_CHALLENGE_METHOD ?? "",
  post_logout_redirect_uri: window.SSO_POST_LOGOUT_REDIRECT ?? "",
};

export async function getClientConfig() {
  return await client.discovery(
    new URL(clientConfig.url),
    clientConfig.client_id
  );
}

export async function Auth() {
  const code_verifier = client.randomPKCECodeVerifier();
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
  const openIdClientConfig = await getClientConfig();
  const state = client.randomState();
  const parameters: Record<string, string> = {
    redirect_uri: clientConfig.redirect_uri,
    scope: clientConfig.scope!,
    code_challenge,
    code_challenge_method: clientConfig.code_challenge_method,
    state,
  };
  const redirectTo = client.buildAuthorizationUrl(
    openIdClientConfig,
    parameters
  );

  return { redirectTo, code_verifier, state };
}

export async function Logout() {
  const openIdClientConfig = await getClientConfig();
  const endSessionUrl = client.buildEndSessionUrl(openIdClientConfig, {
    post_logout_redirect_uri: clientConfig.post_logout_redirect_uri,
  });

  return endSessionUrl;
}

export async function Callback(
  code_verifier: string,
  state: string | undefined
) {
  try {
    const openIdClientConfig = await getClientConfig();
    const currentLocation = getLocation();

    console.info("Callback URL:", currentLocation);
    console.info("Code verifier:", code_verifier);

    const tokenSet = await client.authorizationCodeGrant(
      openIdClientConfig,
      new URL(currentLocation),
      {
        pkceCodeVerifier: code_verifier,
        expectedState: state,
      }
    );

    const { access_token } = tokenSet;
    const claims = tokenSet.claims()!;
    const { sub } = claims;

    const userinfo = await client.fetchUserInfo(
      openIdClientConfig,
      access_token,
      sub
    );

    return { tokenSet, userinfo };
  } catch (e) {
    console.error("Token grant error:", e);
  }
}
