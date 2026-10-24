import type { RootState } from '@common/app/store'
import { resolveUriTemplate } from '@linagora/twake-utils'

/**
 * URL of the user's platform: their workplace FQDN from the SSO, or
 * WORKPLACE_FQDN_FALLBACK when the SSO does not give it.
 *
 * @returns null when neither gives one: calendar then runs without the
 * platform.
 */
export const selectPlatformURL = (state: RootState): string | null => {
  const user = state.user.userData
  // The user data stays empty until the user is signed in
  if (!user?.email) return null
  const workplace = resolveUriTemplate('{workplaceFqdn}', {
    localpart: user.email.split('@')[0],
    workplaceFqdn: user.workplaceFqdn,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })
  return workplace ? `https://${workplace}` : null
}
