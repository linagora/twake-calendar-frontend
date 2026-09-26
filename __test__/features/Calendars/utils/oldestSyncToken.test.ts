import { oldestSyncToken } from '@common/features/Calendars/utils/oldestSyncToken'

const token = (n: number): string => `http://sabre.io/ns/sync/${n}`

describe('oldestSyncToken', () => {
  it('takes the incoming token when none is held', () => {
    expect(oldestSyncToken(undefined, token(3))).toBe(token(3))
  })

  it('keeps the held token when none comes in', () => {
    expect(oldestSyncToken(token(3), undefined)).toBe(token(3))
  })

  it('keeps the older token when a later range answers with a newer one', () => {
    expect(oldestSyncToken(token(3), token(4))).toBe(token(3))
  })

  it('moves back to an older token', () => {
    expect(oldestSyncToken(token(4), token(3))).toBe(token(3))
  })

  it('compares the sequences as numbers, not as strings', () => {
    expect(oldestSyncToken(token(9), token(10))).toBe(token(9))
  })

  it('keeps the held token when the tokens cannot be compared', () => {
    expect(oldestSyncToken('opaque-a', 'opaque-b')).toBe('opaque-a')
  })

  it('does not read a sequence out of a token that merely ends with digits', () => {
    expect(oldestSyncToken('opaque-10', 'opaque-2')).toBe('opaque-10')
  })

  it('keeps the held token when the incoming one is malformed', () => {
    expect(oldestSyncToken(token(4), 'http://sabre.io/ns/sync/')).toBe(token(4))
  })

  it('does not compare sequences across namespaces', () => {
    expect(oldestSyncToken(token(4), 'http://other.example/ns/sync/1')).toBe(
      token(4)
    )
  })
})
