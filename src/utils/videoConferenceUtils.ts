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
    baseUrl ||
    (window as any).VIDEO_CONFERENCE_BASE_URL ||
    "https://meet.linagora.com";
  const meetingId = generateMeetingId();
  return `${base}/${meetingId}`;
}

/**
 * Add video conference footer to event description
 * @param {string} description - Original description
 * @param {string} meetingLink - Generated meeting link
 * @returns {string} Description with video conference footer
 */
export function addVideoConferenceToDescription(
  description: string,
  meetingLink: string
): string {
  const footer = `\n\nVisio: ${meetingLink}`;
  return description + footer;
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
