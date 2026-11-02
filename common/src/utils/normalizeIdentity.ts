// Some clients pad the address after the scheme: "mailto: user@example.com"
export function stripMailto(email?: string): string {
  return (email ?? '').trim().replace(/^mailto:\s*/i, '')
}

export function normalizeIdentity(email?: string): string {
  return stripMailto(email).toLowerCase()
}
