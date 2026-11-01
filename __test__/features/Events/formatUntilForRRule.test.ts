import { formatUntilForRRule } from '@common/features/Events/utils/formatDateToICal'
import { RepetitionObject } from '@common/types/Repetition'

describe('formatUntilForRRule', () => {
  it('ends a date picked in the form at the end of that day, in the series zone', () => {
    expect(formatUntilForRRule('2024-12-31', false, 'Europe/Paris')).toBe(
      '20241231T225959Z'
    )
  })

  it('writes a DATE UNTIL for an all-day series', () => {
    expect(formatUntilForRRule('2024-12-31', true, 'Europe/Paris')).toBe(
      '20241231'
    )
  })

  describe('UNTIL in DATE-TIME form, as the server sends it (#1898)', () => {
    it('keeps a UTC DATE-TIME', () => {
      expect(
        formatUntilForRRule('2025-04-28T07:00:00Z', false, 'Europe/Paris')
      ).toBe('20250428T070000Z')
    })

    it('keeps a UTC DATE-TIME in basic format', () => {
      expect(
        formatUntilForRRule('20250428T070000Z', false, 'Europe/Paris')
      ).toBe('20250428T070000Z')
    })

    it('keeps a UTC DATE-TIME for a Windows TZID', () => {
      expect(
        formatUntilForRRule(
          '2029-03-12T20:00:00Z',
          false,
          'Newfoundland Standard Time'
        )
      ).toBe('20290312T200000Z')
    })

    it('converts a DATE-TIME with an offset to UTC', () => {
      expect(
        formatUntilForRRule('2025-04-28T09:00:00+02:00', false, 'Europe/Paris')
      ).toBe('20250428T070000Z')
    })

    it('reads a floating DATE-TIME in the series zone', () => {
      expect(
        formatUntilForRRule('2025-04-28T09:00:00', false, 'Europe/Paris')
      ).toBe('20250428T070000Z')
    })

    it('keeps the date of a DATE-TIME for an all-day series', () => {
      expect(
        formatUntilForRRule('2025-04-28T00:00:00Z', true, 'Europe/Paris')
      ).toBe('20250428')
    })

    it('RepetitionObject#asJcal writes the stored UNTIL back', () => {
      const rule = new RepetitionObject({
        freq: 'weekly',
        interval: 1,
        endDate: '2025-04-28T07:00:00Z',
        allday: false,
        timezone: 'Europe/Paris'
      }).asJcal()[3] as Record<string, unknown>
      expect(rule.until).toBe('20250428T070000Z')
    })
  })
})
