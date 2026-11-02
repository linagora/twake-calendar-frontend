import { normalizeIdentity, stripMailto } from '@common/utils/normalizeIdentity'

describe('normalizeIdentity', () => {
  it.each([
    'user@example.com',
    'mailto:user@example.com',
    'MAILTO:User@Example.com',
    '  mailto:user@example.com  ',
    'mailto: user@example.com',
    'mailto:\tuser@example.com'
  ])('reduces %p to the bare address', address => {
    expect(normalizeIdentity(address)).toBe('user@example.com')
  })

  it('keeps the case of the address when only stripping the scheme', () => {
    expect(stripMailto('mailto: User@Example.com')).toBe('User@Example.com')
  })

  it('reads a missing address as an empty one', () => {
    expect(normalizeIdentity(undefined)).toBe('')
  })
})
