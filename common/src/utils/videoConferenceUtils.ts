/**
 * Utility functions for video conference meeting generation
 */

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
 * Generate a complete meeting link
 */
export function generateMeetingLink(baseUrl?: string, sub?: string): string {
  let base = baseUrl || window.VIDEO_CONFERENCE_BASE_URL
  if (!base) return ''

  if (base.includes('{localpart}')) {
    base = base.replace('{localpart}', sub || '')
  }

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

function injectVisioIntoHost(host: string): string {
  const parts = host.split('.')
  parts[0] = `${parts[0]}-visio`
  return parts.join('.')
}

function getCleanPath(visioPath?: string): string {
  if (!visioPath) return ''
  return `/${visioPath.replace(/^\//, '')}`
}

/**
 * Convert a workplace FQDN to a Visio base URL by appending -visio to the first subdomain segment.
 * E.g., xxxx.twake.app -> https://xxxx-visio.twake.app
 */
export function getVisioBaseUrl(workplaceFqdn: string): string {
  if (!workplaceFqdn) return ''

  const trimmed = workplaceFqdn.trim()
  const protocol = trimmed.startsWith('http://') ? 'http://' : 'https://'
  const host = trimmed.replace(/^https?:\/\//, '')
  const hostWithVisio = injectVisioIntoHost(host)
  const cleanPath = getCleanPath(window.VISIO_PATH)

  return `${protocol}${hostWithVisio}${cleanPath}`
}
