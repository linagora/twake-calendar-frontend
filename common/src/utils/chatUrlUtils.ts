/**
 * Utility functions for the chat application URL.
 */

import {
  resolveUriTemplate,
  UriTemplateContext
} from '@common/utils/uriTemplateUtils'

/**
 * Resolve the CHAT_SPA_URL configuration entry.
 *
 * CHAT_SPA_URL is a URI template (RFC 6570 style).
 *
 * @returns the resolved base URL, or null when CHAT_SPA_URL is not configured.
 */
export function resolveChatSpaUrl(
  context: UriTemplateContext = {}
): string | null {
  const template = window.CHAT_SPA_URL
  if (!template) return null

  return resolveUriTemplate(template, context)
}
