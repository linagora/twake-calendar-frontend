/**
 * @jest-environment jsdom
 */

import { resolveTdriveUrl } from '@common/utils/tdriveUrlUtils'

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
