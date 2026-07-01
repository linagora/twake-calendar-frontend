import { resolveUriTemplate } from '@common/utils/uriTemplateUtils'

describe('resolveUriTemplate', () => {
  const fqdn = 'tmle.stg.lin-saas.com'

  it('should resolve {localpart}', () => {
    const template = 'https://visio-{localpart}.twake.app/#/bridge'
    const result = resolveUriTemplate(template, { localpart: 'alice' })
    expect(result).toBe('https://visio-alice.twake.app/#/bridge')
  })

  it('should resolve {workplaceFqdn}', () => {
    const template = 'https://mail-{workplaceFqdn}'
    const result = resolveUriTemplate(template, { workplaceFqdn: fqdn })
    expect(result).toBe('https://mail-tmle.stg.lin-saas.com')
  })

  it('should resolve {workplaceFqdn.localpart} and {workplaceFqdn.domain}', () => {
    const template =
      'https://{workplaceFqdn.localpart}-mail.{workplaceFqdn.domain}'
    const result = resolveUriTemplate(template, { workplaceFqdn: fqdn })
    expect(result).toBe('https://tmle-mail.stg.lin-saas.com')
  })

  it('should resolve {workplaceFqdn.domain} to empty for a single-label FQDN', () => {
    const template =
      'https://{workplaceFqdn.localpart}-mail.{workplaceFqdn.domain}'
    const result = resolveUriTemplate(template, { workplaceFqdn: 'localhost' })
    expect(result).toBe('https://localhost-mail.')
  })

  it('should leave unknown expressions untouched', () => {
    const template = 'https://{unknown}.example.com'
    expect(resolveUriTemplate(template, {})).toBe(template)
  })

  it('should resolve missing context values to empty string', () => {
    const template = 'https://{localpart}-mail.{workplaceFqdn}'
    expect(resolveUriTemplate(template, {})).toBe('https://-mail.')
  })
})
