import { resolveUriTemplate } from '@linagora/twake-utils'

/**
 * URL of the user's Cozy, built from the workplace FQDN provided by the OIDC
 * user info; null when there is none. Same calculation as the standalone
 * Twake bar (TwakeBarContext).
 */
export const getCozyURL = (
  email: string | undefined,
  workplaceFqdn: string | undefined
): string | null => {
  if (!workplaceFqdn) return null
  const workplace = resolveUriTemplate('{workplaceFqdn}', {
    localpart: email?.split('@')[0],
    workplaceFqdn
  })
  return workplace ? `https://${workplace}` : null
}
