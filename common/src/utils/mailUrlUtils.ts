/**
 * Utility functions for the mail application (mail composer) URL.
 */

import {
  resolveUriTemplate,
  UriTemplateContext
} from '@common/utils/uriTemplateUtils'

/**
 * Resolve the MAIL_SPA_URL configuration entry.
 *
 * MAIL_SPA_URL is a URI template (RFC 6570 style) so it can support platform
 * mode, the same way VIDEO_CONFERENCE_BASE_URL does. See
 * {@link resolveUriTemplate} for the list of supported expressions.
 *
 * @returns the resolved base URL, or null when MAIL_SPA_URL is not configured.
 */
export function resolveMailSpaUrl(
  context: UriTemplateContext = {}
): string | null {
  const template = window.MAIL_SPA_URL
  if (!template) return null

  return resolveUriTemplate(template, context)
}
