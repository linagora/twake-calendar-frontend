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

// The domain of an address, empty when it has none
export function domainOf(email?: string): string {
  const address = normalizeIdentity(email)
  const at = address.lastIndexOf('@')
  return at < 0 ? '' : address.slice(at + 1)
}

// An address without a domain cannot be vouched for: it counts as external
export function isOfAnotherDomain(email?: string, reference?: string): boolean {
  const domain = domainOf(email)
  return domain === '' || domain !== domainOf(reference)
}
