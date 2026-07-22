import {
  buildPrintPeriods,
  MAX_PRINT_PERIODS,
  printDayjs as dayjs
} from '../index'

describe('buildPrintPeriods', () => {
  it('returns a single week page when the range fits in one ISO week', () => {
    const start = dayjs('2026-07-22') // Wednesday
    const periods = buildPrintPeriods('week', start, start)

    expect(periods).toHaveLength(1)
    // ISO week starts on Monday 2026-07-20.
    expect(periods[0].start.format('YYYY-MM-DD')).toBe('2026-07-20')
    expect(periods[0].end.format('YYYY-MM-DD')).toBe('2026-07-27')
    expect(periods[0].label).toContain('Week')
  })

  it('creates one page per day at day scale, inclusive of both bounds', () => {
    const periods = buildPrintPeriods(
      'day',
      dayjs('2026-07-22'),
      dayjs('2026-07-24')
    )

    expect(periods.map(p => p.start.format('YYYY-MM-DD'))).toEqual([
      '2026-07-22',
      '2026-07-23',
      '2026-07-24'
    ])
  })

  it('creates one page per month at month scale', () => {
    const periods = buildPrintPeriods(
      'month',
      dayjs('2026-01-15'),
      dayjs('2026-03-02')
    )

    expect(periods).toHaveLength(3)
    expect(periods[0].start.format('YYYY-MM-DD')).toBe('2026-01-01')
    expect(periods[2].end.format('YYYY-MM-DD')).toBe('2026-04-01')
  })

  it('caps the number of generated pages', () => {
    const periods = buildPrintPeriods(
      'day',
      dayjs('2026-01-01'),
      dayjs('2030-01-01')
    )

    expect(periods).toHaveLength(MAX_PRINT_PERIODS)
  })
})
