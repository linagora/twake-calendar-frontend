import { parseIntentDate } from '@common/features/Intents/intentData'

describe('parseIntentDate', () => {
  it('reads a calendar day', () => {
    expect(parseIntentDate({ date: '2026-10-03' })).toBe('2026-10-03')
    expect(parseIntentDate({ date: '2028-02-29' })).toBe('2028-02-29')
  })

  it('rejects anything but an existing YYYY-MM-DD day', () => {
    expect(parseIntentDate({ date: '2026-02-31' })).toBe(null)
    expect(parseIntentDate({ date: '03/10/2026' })).toBe(null)
    expect(parseIntentDate({ date: 20261003 })).toBe(null)
    expect(parseIntentDate({})).toBe(null)
    expect(parseIntentDate(null)).toBe(null)
    expect(parseIntentDate('2026-10-03')).toBe(null)
  })
})
