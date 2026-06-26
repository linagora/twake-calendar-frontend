const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class EmailAddress {
  readonly value: string

  private constructor(value: string) {
    this.value = value.toLowerCase().trim()
  }

  static parse(raw: string): EmailAddress | null {
    const trimmed = raw.trim()
    if (!EMAIL_REGEX.test(trimmed)) return null
    return new EmailAddress(trimmed)
  }

  toString(): string {
    return this.value
  }
}
