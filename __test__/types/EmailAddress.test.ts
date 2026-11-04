import { parseNewEventAttendees } from '@common/features/Events/newEventDeepLinkUtils'
import { EmailAddress, isEmailShaped } from '@common/types/EmailAddress'
import { isValidEmail } from '@common/utils/isValidEmail'

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

  describe('isEmailShaped', () => {
    const PREVIOUS_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    it.each([
      'user@example.com',
      'a@b.c',
      'a@.b.c',
      'a@b..c',
      'a@b.c.',
      'a@.bc',
      'a@bc.',
      'a@b.',
      'a@.b',
      'a@.',
      'a@..',
      'a@...',
      'a@bc',
      '@b.c',
      'a@b@c.d',
      'a b@c.d',
      'a@b c.d',
      ' a@b.c',
      'a@b.c ',
      'user.name+tag@sub.example.org'
    ])('matches the previous regex on %j', candidate => {
      expect(isEmailShaped(candidate)).toBe(
        PREVIOUS_EMAIL_REGEX.test(candidate)
      )
    })

    describe('long almost valid addresses (#1944)', () => {
      const almostValid = ['@', ' a'].map(
        suffix => 'a@' + 'a.'.repeat(32000) + suffix
      )

      it.each([
        ['EmailAddress.parse', (value: string) => EmailAddress.parse(value)],
        ['isValidEmail', (value: string) => isValidEmail(value)],
        [
          'parseNewEventAttendees',
          (value: string) =>
            parseNewEventAttendees(new URLSearchParams({ attendee: value }))
        ]
      ])('%s rejects them in linear time', (_, validate) => {
        almostValid.forEach(value => {
          const start = performance.now()
          const result = validate(value)
          expect(performance.now() - start).toBeLessThan(100)
          expect(
            result === null ||
              result === false ||
              (Array.isArray(result) && result.length === 0)
          ).toBe(true)
        })
      })
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
