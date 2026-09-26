import { isWithinRange } from '@common/components/Calendar/utils/isWithinRange'

describe('isWithinRange', () => {
  // the week the grid shows, Monday included, next Monday excluded
  const monday = new Date('2026-09-21T00:00:00+02:00')
  const nextMonday = new Date('2026-09-28T00:00:00+02:00')

  it('holds the Sunday that closes the week', () => {
    const sunday = new Date('2026-09-27T10:00:00+02:00')

    expect(isWithinRange(sunday, monday, nextMonday)).toBe(true)
  })

  it('holds the very start of the range', () => {
    expect(isWithinRange(monday, monday, nextMonday)).toBe(true)
  })

  it('excludes the end of the range', () => {
    expect(isWithinRange(nextMonday, monday, nextMonday)).toBe(false)
  })

  it('excludes the day before', () => {
    const sundayBefore = new Date('2026-09-20T23:59:00+02:00')

    expect(isWithinRange(sundayBefore, monday, nextMonday)).toBe(false)
  })
})
