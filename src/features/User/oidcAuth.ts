import * as client from "openid-client";

export const clientConfig = {
  url: (window as any).SSO_BASE_URL ?? "",
  client_id: (window as any).SSO_CLIENT_ID ?? "",
  scope: (window as any).SSO_SCOPE ?? "",
  redirect_uri: (window as any).SSO_REDIRECT_URI ?? "",
  response_type: (window as any).SSO_RESPONSE_TYPE ?? "",
  code_challenge_method: (window as any).SSO_CODE_CHALLENGE_METHOD ?? "",
  post_logout_redirect_uri: (window as any).SSO_POST_LOGOUT_REDIRECT ?? "",
};

export async function getClientConfig() {
  return await client.discovery(
    new URL(clientConfig.url),
    clientConfig.client_id
  );
}

export async function Auth() {
  let code_verifier = client.randomPKCECodeVerifier();
  let code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
  const openIdClientConfig = await getClientConfig();
  let parameters: Record<string, string> = {
    redirect_uri: clientConfig.redirect_uri,
    scope: clientConfig.scope!,
    code_challenge,
    code_challenge_method: clientConfig.code_challenge_method,
  };
  let state!: string;
  if (!openIdClientConfig.serverMetadata().supportsPKCE()) {
    state = client.randomState();
    parameters.state = state;
  }
  let redirectTo = client.buildAuthorizationUrl(openIdClientConfig, parameters);

  return { redirectTo, code_verifier, state };
}

export async function Logout() {
  const openIdClientConfig = await getClientConfig();
  const endSessionUrl = client.buildEndSessionUrl(openIdClientConfig, {
    post_logout_redirect_uri: clientConfig.post_logout_redirect_uri,
  });

  return endSessionUrl;
}

export async function Callback(code_verifier: string, state: any) {
  try {
    const openIdClientConfig = await getClientConfig();
    const currentUrl = new URL(window.location.href);

    console.log("Callback URL:", currentUrl.toString());
    console.log("Code verifier:", code_verifier);

    const tokenSet = await client.authorizationCodeGrant(
      openIdClientConfig,
      currentUrl,
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
