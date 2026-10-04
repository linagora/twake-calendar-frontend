import { translateErrorMessage } from '@common/utils/translateErrorMessage'

const t = (key: string, params?: Record<string, string>): string =>
  `${key}${params && Object.keys(params).length ? JSON.stringify(params) : ''}`

describe('translateErrorMessage', () => {
  it('keeps a plain message as is', () => {
    expect(translateErrorMessage('Network error', t)).toBe('Network error')
  })

  it('translates a translation key', () => {
    expect(translateErrorMessage('TRANSLATION:error.ssoUnreachable', t)).toBe(
      'error.ssoUnreachable'
    )
  })

  it('passes the decoded parameters to the translation', () => {
    expect(
      translateErrorMessage(
        'TRANSLATION:calendar.userDoesNotHaveValidId|name=Jos%C3%A9%20R',
        t
      )
    ).toBe('calendar.userDoesNotHaveValidId{"name":"José R"}')
  })
})
