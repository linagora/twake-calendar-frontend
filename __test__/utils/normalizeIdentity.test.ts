import { userOrganiser } from '@common/features/User/userDataTypes'
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

  it('keeps what follows the scheme as written when only stripping it', () => {
    expect(stripMailto('mailto: User@Example.com')).toBe(' User@Example.com')
  })

  it('reads a missing address as an empty one', () => {
    expect(normalizeIdentity(undefined)).toBe('')
  })
})

describe('userOrganiser', () => {
  it('writes a padded address and SENT-BY back as stored', () => {
    const organizer = new userOrganiser({
      cal_address: 'mailto: alice@example.com',
      sentBy: 'mailto: assistant@example.com'
    })

    expect(organizer.asJcal()).toEqual([
      'organizer',
      { 'sent-by': 'mailto: assistant@example.com' },
      'cal-address',
      'mailto: alice@example.com'
    ])
  })
})
