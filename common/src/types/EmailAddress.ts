// Each part excludes '@', so the split is unambiguous and matching is linear.
// The domain dot is checked without a regex: `[^\s@]+\.[^\s@]+` backtracks
// quadratically on long domains holding many dots (#1944).
const LOCAL_AND_DOMAIN_REGEX = /^[^\s@]+@([^\s@]+)$/

export function isEmailShaped(candidate: string): boolean {
  const domain = LOCAL_AND_DOMAIN_REGEX.exec(candidate)?.[1]
  return domain !== undefined && domain.slice(1, -1).includes('.')
}

export class EmailAddress {
  readonly value: string

  private constructor(value: string) {
    this.value = value.toLowerCase().trim()
  }

  static parse(raw: string): EmailAddress | null {
    const trimmed = raw.trim()
    if (!isEmailShaped(trimmed)) return null
    return new EmailAddress(trimmed)
  }

  toString(): string {
    return this.value
  }

  static sameAddress(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }
}
