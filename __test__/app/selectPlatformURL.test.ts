/**
 * @jest-environment jsdom
 */

import { selectPlatformURL } from '@common/app/selectors/selectPlatformURL'
import type { RootState } from '@common/app/store'

const stateWith = (userData: {
  email?: string
  workplaceFqdn?: string
}): RootState => ({ user: { userData } }) as unknown as RootState

describe('selectPlatformURL', () => {
  const originalFallback = window.WORKPLACE_FQDN_FALLBACK

  afterEach(() => {
    window.WORKPLACE_FQDN_FALLBACK = originalFallback
  })

  it('uses the workplace FQDN from the SSO', () => {
    window.WORKPLACE_FQDN_FALLBACK = '{localpart}.fallback.com'

    expect(
      selectPlatformURL(
        stateWith({
          email: 'alice@example.com',
          workplaceFqdn: 'w.example.com'
        })
      )
    ).toBe('https://w.example.com')
  })

  it('falls back to WORKPLACE_FQDN_FALLBACK', () => {
    window.WORKPLACE_FQDN_FALLBACK = '{localpart}.fallback.com'

    expect(selectPlatformURL(stateWith({ email: 'alice@example.com' }))).toBe(
      'https://alice.fallback.com'
    )
  })

  it('is null without a workplace FQDN nor a fallback', () => {
    window.WORKPLACE_FQDN_FALLBACK = undefined

    expect(selectPlatformURL(stateWith({ email: 'alice@example.com' }))).toBe(
      null
    )
  })

  it('is null before the user is signed in', () => {
    window.WORKPLACE_FQDN_FALLBACK = '{localpart}.fallback.com'

    expect(selectPlatformURL(stateWith({}))).toBe(null)
  })
})
