/**
 * Utility functions for Tdrive URL resolution
 */

import {
  resolveUriTemplate,
  UriTemplateContext
} from '@common/utils/uriTemplateUtils'

/**
 * Resolve the TDRIVE_INTENT_URL configuration entry.
 *
 * TDRIVE_INTENT_URL is a URI template (RFC 6570 style) so it can support platform
 * mode, the same way VIDEO_CONFERENCE_BASE_URL and MAIL_SPA_URL do. See
 * {@link resolveUriTemplate} for the list of supported expressions.
 *
 * @returns the resolved base URL, or null when TDRIVE_INTENT_URL is not configured.
 */
export function resolveTdriveUrl(
  context: UriTemplateContext = {}
): string | null {
  const template = window.TDRIVE_INTENT_URL
  if (!template) return null

  return resolveUriTemplate(template, context)
}
