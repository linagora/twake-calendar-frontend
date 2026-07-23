/**
 * @jest-environment jsdom
 */

import { resolveTdriveUrl, isTdriveEnabled } from '@common/utils/tdriveUrlUtils'

describe('resolveTdriveUrl', () => {
  const originalUrl = window.TDRIVE_INTENT_URL

  afterEach(() => {
    window.TDRIVE_INTENT_URL = originalUrl
  })

  it('should return null when TDRIVE_INTENT_URL is not configured', () => {
    // @ts-expect-error simulate missing configuration
    window.TDRIVE_INTENT_URL = undefined
    expect(resolveTdriveUrl()).toBeNull()
  })

  it('should return null when TDRIVE_INTENT_URL is empty string', () => {
    window.TDRIVE_INTENT_URL = ''
    expect(resolveTdriveUrl()).toBeNull()
  })

  it('should resolve plain URL without template variables', () => {
    window.TDRIVE_INTENT_URL = 'https://drive.example.com'
    expect(resolveTdriveUrl()).toBe('https://drive.example.com')
  })

  it('should resolve {localpart} template', () => {
    window.TDRIVE_INTENT_URL = 'https://{localpart}-drive.example.com'
    expect(resolveTdriveUrl({ localpart: 'alice' })).toBe(
      'https://alice-drive.example.com'
    )
  })

  it('should resolve workplaceFqdn expressions', () => {
    window.TDRIVE_INTENT_URL =
      'https://{workplaceFqdn.localpart}-drive.{workplaceFqdn.domain}'
    expect(resolveTdriveUrl({ workplaceFqdn: 'tmle.stg.lin-saas.com' })).toBe(
      'https://tmle-drive.stg.lin-saas.com'
    )
  })

  it('should resolve combined localpart and workplaceFqdn', () => {
    window.TDRIVE_INTENT_URL = 'https://{localpart}-drive.{workplaceFqdn}'
    expect(
      resolveTdriveUrl({
        localpart: 'bob',
        workplaceFqdn: 'acme.cozy.tools'
      })
    ).toBe('https://bob-drive.acme.cozy.tools')
  })

  it('should leave unknown expressions untouched', () => {
    window.TDRIVE_INTENT_URL = 'https://drive.example.com/{unknown}'
    expect(resolveTdriveUrl()).toBe('https://drive.example.com/{unknown}')
  })
})

describe('isTdriveEnabled', () => {
  const originalEnabled = window.TDRIVE_ENABLED
  const originalUrl = window.TDRIVE_INTENT_URL

  afterEach(() => {
    window.TDRIVE_ENABLED = originalEnabled
    window.TDRIVE_INTENT_URL = originalUrl
  })

  it('returns false when TDRIVE_ENABLED is undefined', () => {
    // @ts-expect-error simulate missing configuration
    window.TDRIVE_ENABLED = undefined
    window.TDRIVE_INTENT_URL = 'https://drive.example.com'
    expect(isTdriveEnabled()).toBe(false)
  })

  it('returns false when TDRIVE_ENABLED is false', () => {
    window.TDRIVE_ENABLED = false
    window.TDRIVE_INTENT_URL = 'https://drive.example.com'
    expect(isTdriveEnabled()).toBe(false)
  })

  it('returns false when TDRIVE_INTENT_URL is not set', () => {
    window.TDRIVE_ENABLED = true
    // @ts-expect-error simulate missing configuration
    window.TDRIVE_INTENT_URL = undefined
    expect(isTdriveEnabled()).toBe(false)
  })

  it('returns true when both TDRIVE_ENABLED and TDRIVE_INTENT_URL are set', () => {
    window.TDRIVE_ENABLED = true
    window.TDRIVE_INTENT_URL = 'https://drive.example.com'
    expect(isTdriveEnabled()).toBe(true)
  })
})
