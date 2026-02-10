/**
 * Utility functions for video conference meeting generation
 */

/**
 * Generate a random meeting ID in format xxx-xxxx-xxx
 * @returns {string} Random meeting ID
 */
export function generateMeetingId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const generateSegment = (length: number): string => {
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  };

  return `${generateSegment(3)}-${generateSegment(4)}-${generateSegment(3)}`;
}

/**
 * Generate a complete meeting link
 * @param {string} baseUrl - Base URL for video conference (from .env.js)
 * @returns {string} Complete meeting link
 */
export function generateMeetingLink(baseUrl?: string): string {
  const base =
    baseUrl || window.VIDEO_CONFERENCE_BASE_URL || "https://meet.linagora.com";
  const meetingId = generateMeetingId();
  return `${base}/${meetingId}`;
}

/**
 * Add video conference footer to event description.
 * If description is empty, adds on first line; otherwise adds on the line below existing content.
 * @param {string} description - Original description
 * @param {string} meetingLink - Generated meeting link
 * @returns {string} Description with video conference footer
 */
export function addVideoConferenceToDescription(
  description: string,
  meetingLink: string
): string {
  const line = `Visio: ${meetingLink}`;
  const trimmed = description.trimEnd();
  return trimmed ? `${trimmed}\n${line}` : line;
}

/**
 * Extract video conference link from description
 * @param {string} description - Event description
 * @returns {string | null} Video conference link if found, null otherwise
 */
export function extractVideoConferenceFromDescription(
  description: string
): string | null {
  const match = description.match(/Visio:\s*(https?:\/\/[^\s]+)/);
  return match ? match[1] : null;
}

const VISIO_LINE_REGEX = /^Visio:\s*https?:\/\/\S+$/;

/**
 * Remove the Visio video conference line from description.
 * Finds and removes the line matching "Visio: <url>" regardless of position (start, middle, end).
 * @param {string} description - Event description
 * @returns {string} Description with the Visio line removed
 */
export function removeVideoConferenceFromDescription(
  description: string
): string {
  const lines = description.split("\n");
  const filtered = lines.filter((line) => !VISIO_LINE_REGEX.test(line.trim()));
  return filtered.join("\n").trimEnd();
}
