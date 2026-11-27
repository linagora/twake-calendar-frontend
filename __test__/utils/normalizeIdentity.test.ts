import { userOrganiser } from '@common/features/User/userDataTypes'
import {
  domainOf,
  isOfAnotherDomain,
  normalizeIdentity,
  stripMailto
} from '@common/utils/normalizeIdentity'

describe('domainOf', () => {
  it.each([
    ['mailto:Bob@Open-Paas.org', 'open-paas.org'],
    ['mailto: bob@sub.example.com ', 'sub.example.com'],
    ['bob', ''],
    [undefined, '']
  ])('reads the domain of %p as %p', (address, domain) => {
    expect(domainOf(address)).toBe(domain)
  })
})

describe('isOfAnotherDomain', () => {
  it('matches domains whatever their case and scheme', () => {
    expect(
      isOfAnotherDomain('mailto:assistant@OPEN-PAAS.org', 'bob@open-paas.org')
    ).toBe(false)
  })

  it('tells another domain apart', () => {
    expect(
      isOfAnotherDomain('attacker@evil.example', 'bob@open-paas.org')
    ).toBe(true)
  })

  it('does not take a subdomain for the domain', () => {
    expect(
      isOfAnotherDomain('attacker@open-paas.org.evil', 'bob@open-paas.org')
    ).toBe(true)
  })

  it('counts an address without a domain as external', () => {
    expect(isOfAnotherDomain('attacker', 'bob')).toBe(true)
  })
})

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
