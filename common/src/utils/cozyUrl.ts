import { resolveUriTemplate } from '@linagora/twake-utils'

/**
 * URL of the user's Cozy, built from the workplace FQDN provided by the OIDC
 * user info, or else from the WORKPLACE_FQDN_FALLBACK configuration entry;
 * null when neither gives one. Same calculation as the standalone Twake bar
 * (TwakeBarContext).
 */
export const getCozyURL = (
  email: string | undefined,
  workplaceFqdn: string | undefined
): string | null => {
  const workplace = resolveUriTemplate('{workplaceFqdn}', {
    localpart: email?.split('@')[0],
    workplaceFqdn,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })
  return workplace ? `https://${workplace}` : null
}
