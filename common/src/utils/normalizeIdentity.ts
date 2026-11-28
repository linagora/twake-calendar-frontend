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

// Hfields ("?…", RFC 6068 §2), a fragment or a percent-escape can hide the
// domain Twake Mail reads: "ceo@company.example?x=@evil.example" is
// ceo@company.example for it, not an address of evil.example
const HIDES_THE_DOMAIN = /[?#%]/

// The domain of an address, empty when it has none or when it is not a plain
// local-part@domain, so that such an address counts as external
export function domainOf(email?: string): string {
  const address = normalizeIdentity(email)
  if (HIDES_THE_DOMAIN.test(address)) return ''
  const [localPart, domain, ...rest] = address.split('@')
  return localPart && domain && rest.length === 0 ? domain : ''
}

// An address without a domain cannot be vouched for: it counts as external
export function isOfAnotherDomain(email?: string, reference?: string): boolean {
  const domain = domainOf(email)
  return domain === '' || domain !== domainOf(reference)
}
