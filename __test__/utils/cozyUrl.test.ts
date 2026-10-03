/**
 * @jest-environment jsdom
 */
import { getCozyURL } from '@common/utils/cozyUrl'

describe('getCozyURL', () => {
  afterEach(() => {
    window.WORKPLACE_FQDN_FALLBACK = undefined
  })

  it('builds the Cozy URL from the workplace FQDN', () => {
    window.WORKPLACE_FQDN_FALLBACK = '{localpart}.fallback.app'

    expect(getCozyURL('alice@example.com', 'alice.twake.app')).toBe(
      'https://alice.twake.app'
    )
  })

  it('falls back to the configured workplace FQDN', () => {
    window.WORKPLACE_FQDN_FALLBACK = '{localpart}.fallback.app'

    expect(getCozyURL('alice@example.com', undefined)).toBe(
      'https://alice.fallback.app'
    )
  })

  it('returns null without any workplace FQDN', () => {
    expect(getCozyURL('alice@example.com', undefined)).toBe(null)
  })
})
