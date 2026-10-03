import { resolveUriTemplate } from '@linagora/twake-utils'

/**
 * URL of the user's Cozy: its workplace FQDN, which may itself be a template
 * on the local part of the email.
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
