import { Dayjs } from 'dayjs'
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

  describe('across a DST change', () => {
    const tz = 'Europe/London'
    const inZone = (date: string): Dayjs => dayjs.tz(date, tz).startOf('day')

    it.each([
      ['day', '2016-10-29', '2016-11-01'],
      ['day', '2016-03-26', '2016-03-29'],
      ['week', '2016-10-20', '2016-11-10'],
      ['month', '2016-09-15', '2016-12-15']
    ] as const)(
      'starts and ends every %s page at local midnight (%s to %s)',
      (scale, from, to) => {
        const periods = buildPrintPeriods(scale, inZone(from), inZone(to))

        periods.forEach(period => {
          expect(period.start.valueOf()).toBe(
            period.start.startOf('day').valueOf()
          )
          expect(period.end.valueOf()).toBe(period.end.startOf('day').valueOf())
        })
        periods.slice(1).forEach((period, index) => {
          expect(period.start.valueOf()).toBe(periods[index].end.valueOf())
        })
      }
    )

    it('ends the page of a GMT day at the next UTC midnight', () => {
      const periods = buildPrintPeriods(
        'day',
        inZone('2016-10-29'),
        inZone('2016-11-01')
      )

      // 2016-10-31 is a GMT day: its page ends at 2016-11-01T00:00:00Z
      expect(periods[2].end.toISOString()).toBe('2016-11-01T00:00:00.000Z')
      expect(periods[3].start.toISOString()).toBe('2016-11-01T00:00:00.000Z')
    })

    it('starts the page following the spring change at local midnight', () => {
      const periods = buildPrintPeriods(
        'day',
        inZone('2016-03-26'),
        inZone('2016-03-29')
      )

      // 2016-03-28 is a BST day: its page starts at 2016-03-27T23:00:00Z
      expect(periods[2].start.toISOString()).toBe('2016-03-27T23:00:00.000Z')
    })
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
