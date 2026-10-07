import { getLocation } from '@common/utils/apiUtils'
import * as client from 'openid-client'

export const clientConfig = {
  url: window.SSO_BASE_URL ?? '',
  client_id: window.SSO_CLIENT_ID ?? '',
  scope: window.SSO_SCOPE ?? '',
  redirect_uri: window.SSO_REDIRECT_URI ?? '',
  response_type: window.SSO_RESPONSE_TYPE ?? '',
  code_challenge_method: window.SSO_CODE_CHALLENGE_METHOD ?? '',
  post_logout_redirect_uri: window.SSO_POST_LOGOUT_REDIRECT ?? ''
}

const DISCOVERY_TIMEOUT_MS = 10_000

export async function getClientConfig() {
  const config = await client.discovery(
    new URL(clientConfig.url),
    clientConfig.client_id,
    undefined,
    undefined,
    { signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS) }
  )
  // Tolerate up to 5 minutes of clock skew between browser and SSO server
  config[client.clockSkew] = 300
  return config
}

export interface AuthOptions {
  /**
   * 'none' makes the SSO answer without showing any page: where a login form
   * cannot be displayed (an intent frame), a dead session comes back as an
   * error instead.
   */
  prompt?: 'none'
}

export async function Auth(options: AuthOptions = {}) {
  const code_verifier = client.randomPKCECodeVerifier()
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
  const openIdClientConfig = await getClientConfig()
  const state = client.randomState()
  const parameters: Record<string, string> = {
    redirect_uri: clientConfig.redirect_uri,
    scope: clientConfig.scope,
    code_challenge,
    code_challenge_method: clientConfig.code_challenge_method,
    state
  }
  if (options.prompt) {
    parameters.prompt = options.prompt
  }
  const redirectTo = client.buildAuthorizationUrl(
    openIdClientConfig,
    parameters
  )

  return { redirectTo, code_verifier, state }
}

export async function Logout() {
  const openIdClientConfig = await getClientConfig()
  const endSessionUrl = client.buildEndSessionUrl(openIdClientConfig, {
    post_logout_redirect_uri: clientConfig.post_logout_redirect_uri
  })

  return endSessionUrl
}

export async function Callback(
  code_verifier: string,
  state: string | undefined
): Promise<{
  tokenSet: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
  userinfo: client.UserInfoResponse
} | void> {
  try {
    const openIdClientConfig = await getClientConfig()
    const currentLocation = getLocation()

    console.info('Callback URL:', currentLocation)

    const tokenSet = await client.authorizationCodeGrant(
      openIdClientConfig,
      new URL(currentLocation),
      {
        pkceCodeVerifier: code_verifier,
        expectedState: state
      }
    )

    const { access_token } = tokenSet
    const claims = tokenSet.claims() as client.IDToken
    const { sub } = claims

    const userinfo = await client.fetchUserInfo(
      openIdClientConfig,
      access_token,
      sub
    )

    return { tokenSet, userinfo }
  } catch (e) {
    console.error('Token grant error:', e)
  }
}
