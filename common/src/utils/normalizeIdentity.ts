// Keeps what follows the scheme as written: it is written back, and the
// scheduling plugin sees any difference in the ORGANIZER as a change
export function stripMailto(email?: string): string {
  return (email ?? '').trim().replace(/^mailto:/i, '')
}

// For comparisons only: some clients pad the address after the scheme,
// "mailto: user@example.com"
export function normalizeIdentity(email?: string): string {
  return stripMailto(email).trim().toLowerCase()
}
