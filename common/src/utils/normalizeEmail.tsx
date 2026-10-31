export function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? ''
}

/**
 * Normalizes an ATTENDEE/ORGANIZER cal-address to a bare email: trimmed,
 * lowercased, `mailto:` stripped. Tolerates padded addresses written by some
 * clients (e.g. "mailto: user@example.com"). See #1886.
 */
export function normalizeCalAddress(address?: string): string {
  return normalizeEmail(normalizeEmail(address).replace(/^mailto:/, ''))
}
