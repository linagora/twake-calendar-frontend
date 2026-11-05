import { formatDate } from '@common/components/EventPreview/utils/formatDate'

const t = (key: string): string => (key === 'locale' ? 'en-US' : key)

describe('formatDate', () => {
  it.each([
    ['2026-12-31T23:59:60Z', false],
    ['2038-00-01', false],
    ['2024-02-29prototype', true]
  ])('gives no text for the unreadable start %s', (start, allday) => {
    expect(formatDate(start, t, 'UTC', allday)).toBe('')
  })

  it('formats a readable start', () => {
    expect(formatDate('2026-07-05T10:00:00Z', t, 'UTC')).toContain('2026')
    expect(formatDate('2026-07-05', t, 'UTC', true)).toContain('2026')
  })
})
