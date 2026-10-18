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

  it('replaces the raw message of a failed request', () => {
    expect(
      translateErrorMessage(
        'Request failed with status code 500 Internal Server Error: PUT http://api/dav/calendars/u1/c1/e1.ics',
        t
      )
    ).toBe('error.requestFailed')
  })
})
