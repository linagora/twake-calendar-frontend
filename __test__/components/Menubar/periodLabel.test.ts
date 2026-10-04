import {
  DisplayedPeriod,
  formatPeriodLabel
} from '@common/components/Menubar/periodLabel'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const t = (key: string): string =>
  MONTHS[Number(key.replace('months.standalone.', ''))]

const calendarShowing = (
  start: Date,
  end: Date,
  timeZone = 'local'
): DisplayedPeriod => ({ start, end, timeZone })

describe('formatPeriodLabel', () => {
  it('shows both months for a week spanning two months', () => {
    const period = calendarShowing(new Date(2026, 8, 28), new Date(2026, 9, 5))

    expect(formatPeriodLabel(period, new Date(2026, 9, 2), t)).toBe(
      'September – October 2026'
    )
  })

  it('does not depend on the current date of the calendar', () => {
    const period = calendarShowing(new Date(2026, 8, 28), new Date(2026, 9, 5))

    expect(formatPeriodLabel(period, new Date(2026, 8, 28), t)).toBe(
      formatPeriodLabel(period, new Date(2026, 9, 2), t)
    )
  })

  it('shows both years for a week spanning two years', () => {
    const period = calendarShowing(new Date(2026, 11, 28), new Date(2027, 0, 4))

    expect(formatPeriodLabel(period, new Date(2026, 11, 28), t)).toBe(
      'December 2026 – January 2027'
    )
  })

  it('shows a single month for a month view', () => {
    const period = calendarShowing(new Date(2026, 9, 1), new Date(2026, 10, 1))

    expect(formatPeriodLabel(period, new Date(2026, 9, 1), t)).toBe(
      'October 2026'
    )
  })

  it('shows a single month for a week within one month', () => {
    const period = calendarShowing(new Date(2026, 9, 5), new Date(2026, 9, 12))

    expect(formatPeriodLabel(period, new Date(2026, 9, 5), t)).toBe(
      'October 2026'
    )
  })

  it('reads the period in the calendar timezone', () => {
    // January 2027 in Kiritimati (UTC+14), the browser being in UTC
    const period = calendarShowing(
      new Date('2026-12-31T10:00:00Z'),
      new Date('2027-01-31T10:00:00Z'),
      'Pacific/Kiritimati'
    )

    expect(formatPeriodLabel(period, new Date(2027, 0, 1), t)).toBe(
      'January 2027'
    )
  })

  it('falls back to the given date without displayed period', () => {
    expect(formatPeriodLabel(undefined, new Date(2024, 3, 15), t)).toBe(
      'April 2024'
    )
  })
})
