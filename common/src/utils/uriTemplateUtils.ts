/**
 * Utilities to resolve URI templates used by platform-mode configuration
 * entries such as VIDEO_CONFERENCE_BASE_URL and MAIL_SPA_URL.
 */

/**
 * Context used to resolve the expressions of a URI template.
 */
export interface UriTemplateContext {
  localpart?: string
  workplaceFqdn?: string
  target?: string
}

/**
 * Resolve a URI-template (RFC 6570 style) configuration value.
 *
 * Supported expressions:
 *  - {localpart}               the user local part
 *  - {workplaceFqdn}           the full workplace FQDN (e.g. tmle.stg.lin-saas.com)
 *  - {workplaceFqdn.localpart} the first label of the FQDN (e.g. tmle)
 *  - {workplaceFqdn.domain}    the FQDN without its first label (e.g. stg.lin-saas.com)
 *  - {target}                  the target username for chat url
 *
 * Unknown expressions are left untouched.
 */
export function resolveUriTemplate(
  template: string,
  { localpart = '', workplaceFqdn = '', target = '' }: UriTemplateContext
): string {
  const [fqdnLocalpart = '', ...fqdnRest] = workplaceFqdn.split('.')
  const fqdnDomain = fqdnRest.join('.')

  const values: Record<string, string> = {
    localpart,
    workplaceFqdn,
    'workplaceFqdn.localpart': fqdnLocalpart,
    'workplaceFqdn.domain': fqdnDomain,
    target
  }

  return template.replace(/\{([^}]+)\}/g, (match, expression: string) => {
    const key = expression.trim()
    return key in values ? values[key] : match
  })
}
