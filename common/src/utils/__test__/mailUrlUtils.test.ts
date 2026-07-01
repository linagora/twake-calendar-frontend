import { resolveMailSpaUrl } from '@common/utils/mailUrlUtils'

// Mock window object for Node.js environment
const mockWindow = {
  MAIL_SPA_URL: 'https://mail.example.com'
}

// @ts-expect-error : Mock window object for Node.js environment
global.window = mockWindow

describe('resolveMailSpaUrl', () => {
  const originalUrl = window.MAIL_SPA_URL

  afterEach(() => {
    window.MAIL_SPA_URL = originalUrl
  })

  it('should return the plain URL when no template expression is used', () => {
    expect(resolveMailSpaUrl({ localpart: 'alice' })).toBe(
      'https://mail.example.com'
    )
  })

  it('should resolve {localpart}', () => {
    window.MAIL_SPA_URL = 'https://{localpart}-mail.twake.app'
    expect(resolveMailSpaUrl({ localpart: 'alice' })).toBe(
      'https://alice-mail.twake.app'
    )
  })

  it('should resolve workplaceFqdn expressions', () => {
    window.MAIL_SPA_URL =
      'https://{workplaceFqdn.localpart}-mail.{workplaceFqdn.domain}'
    expect(resolveMailSpaUrl({ workplaceFqdn: 'tmle.stg.lin-saas.com' })).toBe(
      'https://tmle-mail.stg.lin-saas.com'
    )
  })

  it('should return null when MAIL_SPA_URL is not configured', () => {
    // @ts-expect-error : simulate missing configuration
    window.MAIL_SPA_URL = undefined
    expect(resolveMailSpaUrl({ localpart: 'alice' })).toBeNull()
  })
})
