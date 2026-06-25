import { EmailAddress } from '@common/types/EmailAddress'

describe('EmailAddress', () => {
  describe('parse', () => {
    it('returns an instance for valid email', () => {
      expect(EmailAddress.parse('user@example.com')).not.toBeNull()
    })

    it('returns null for invalid email', () => {
      expect(EmailAddress.parse('invalid')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(EmailAddress.parse('')).toBeNull()
    })

    it('normalizes to lowercase', () => {
      expect(EmailAddress.parse('USER@EXAMPLE.COM')?.value).toBe(
        'user@example.com'
      )
    })

    it('trims whitespace', () => {
      expect(EmailAddress.parse('  user@example.com  ')?.value).toBe(
        'user@example.com'
      )
    })

    it('returns null for missing @', () => {
      expect(EmailAddress.parse('userexample.com')).toBeNull()
    })

    it('returns null for missing domain', () => {
      expect(EmailAddress.parse('user@')).toBeNull()
    })
  })

  describe('toString', () => {
    it('returns the normalized value', () => {
      expect(EmailAddress.parse('user@example.com')?.toString()).toBe(
        'user@example.com'
      )
    })
  })
})
