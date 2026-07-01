/**
 * Utility functions for video conference meeting generation
 */

import {
  resolveUriTemplate,
  UriTemplateContext
} from '@common/utils/uriTemplateUtils'

/**
 * Generate a random meeting ID in format xxx-xxxx-xxx
 * @returns {string} Random meeting ID
 */
export function generateMeetingId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const generateSegment = (length: number): string => {
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  }

  return `${generateSegment(3)}-${generateSegment(4)}-${generateSegment(3)}`
}

/**
 * Context used to resolve the template expressions of VIDEO_CONFERENCE_BASE_URL.
 */
export type VisioTemplateContext = UriTemplateContext

/**
 * Resolve a URI-template (RFC 6570 style) VIDEO_CONFERENCE_BASE_URL.
 *
 * See {@link resolveUriTemplate} for the list of supported expressions.
 */
export function resolveVisioTemplate(
  template: string,
  context: VisioTemplateContext
): string {
  return resolveUriTemplate(template, context)
}

/**
 * Generate a complete meeting link from the VIDEO_CONFERENCE_BASE_URL template.
 */
export function generateMeetingLink(
  context: VisioTemplateContext = {},
  baseUrl?: string
): string {
  const template = baseUrl || window.VIDEO_CONFERENCE_BASE_URL
  if (!template) return ''

  const base = resolveUriTemplate(template, context)
  const meetingId = generateMeetingId()
  return `${base}/${meetingId}`
}

/**
 * Add video conference footer to event description.
 * If description is empty, adds on first line; otherwise adds on the line below existing content.
 */
export function addVideoConferenceToDescription(
  description: string,
  meetingLink: string
): string {
  const line = `Visio: ${meetingLink}`
  const trimmed = description.trimEnd()
  return trimmed ? `${trimmed}\n${line}` : line
}

/**
 * Extract video conference link from description
 */
export function extractVideoConferenceFromDescription(
  description: string
): string | null {
  const match = description.match(/Visio:\s*(https?:\/\/[^\s]+)/)
  return match ? match[1] : null
}

const VISIO_LINE_REGEX = /^Visio:\s*https?:\/\/\S+$/

/**
 * Remove the Visio video conference line from description.
 * Finds and removes the line matching "Visio: <url>" regardless of position (start, middle, end).
 */
export function removeVideoConferenceFromDescription(
  description: string
): string {
  const lines = description.split('\n')
  const filtered = lines.filter(line => !VISIO_LINE_REGEX.test(line.trim()))
  return filtered.join('\n').trimEnd()
}
