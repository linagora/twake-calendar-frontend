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
})
