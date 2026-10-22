import { createSdk, type Sdk } from '@linagora/twake-sdk'

// One client for the whole session: its token outlives the id token, which
// expires after an hour and is not renewed
let session: { sdk: Sdk; signingIn: Promise<void> | null } | null = null

const getSession = (platformURL: string): NonNullable<typeof session> => {
  session ??= { sdk: createSdk({ platformURL }), signingIn: null }
  return session
}

/**
 * The SDK client of the user's platform, signed in or not yet: what shows the
 * platform data follows its status.
 */
export const getPlatformSdk = (platformURL: string): Sdk =>
  getSession(platformURL).sdk

/**
 * Signs the SDK client of the user's platform in with their id token, unless
 * it is already signed in: the client then refreshes its own token.
 * Concurrent callers share the same token exchange.
 *
 * @returns the signed in client
 */
export async function ensureSdkSignedIn(
  platformURL: string,
  idToken: string
): Promise<Sdk> {
  const current = getSession(platformURL)

  if (current.sdk.status !== 'ready') {
    current.signingIn ??= current.sdk.login(idToken).finally(() => {
      current.signingIn = null
    })
    await current.signingIn
  }

  return current.sdk
}
