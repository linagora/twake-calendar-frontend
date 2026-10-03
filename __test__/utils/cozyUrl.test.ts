import { getCozyURL } from '@common/utils/cozyUrl'

describe('getCozyURL', () => {
  it('builds the Cozy URL from the workplace FQDN', () => {
    expect(getCozyURL('alice@example.com', 'alice.twake.app')).toBe(
      'https://alice.twake.app'
    )
  })

  it('returns null without a workplace FQDN', () => {
    expect(getCozyURL('alice@example.com', undefined)).toBe(null)
  })
})
