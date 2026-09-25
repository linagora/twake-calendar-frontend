import { getCalendarRange } from '@common/utils/dateUtils'

describe('getCalendarRange', () => {
  it('Nov 2025: 2025-10-27 to 2025-12-07', () => {
    const { start, end } = getCalendarRange(
      new Date('2025-11-01T00:00:00.000Z')
    )
    expect(start.toISOString().slice(0, 10)).toBe('2025-10-27')
    expect(end.toISOString().slice(0, 10)).toBe('2025-12-07')
  })

  it('Dec 2025: end Sunday 2026-01-11', () => {
    const { start, end } = getCalendarRange(
      new Date('2025-12-01T00:00:00.000Z')
    )
    expect(start.toISOString().slice(0, 10)).toBe('2025-12-01')
    expect(end.toISOString().slice(0, 10)).toBe('2026-01-11')
  })

  it('Feb 2025 (short month): end Sunday 2025-03-09', () => {
    const { start, end } = getCalendarRange(
      new Date('2025-02-01T00:00:00.000Z')
    )
    expect(start.toISOString().slice(0, 10)).toBe('2025-01-27')
    expect(end.toISOString().slice(0, 10)).toBe('2025-03-09')
  })

  it('Sep 2026: covers the adjacent-month days of the sixth row (#1412)', () => {
    const { start, end } = getCalendarRange(new Date(2026, 8, 15))
    expect(start).toEqual(new Date(2026, 7, 31, 0, 0, 0, 0))
    expect(end).toEqual(new Date(2026, 9, 11, 23, 59, 59, 999))
  })

  it('Feb 2027 (starts on a Monday, four weeks long): still spans six weeks', () => {
    const { start, end } = getCalendarRange(new Date(2027, 1, 10))
    expect(start).toEqual(new Date(2027, 1, 1, 0, 0, 0, 0))
    expect(end).toEqual(new Date(2027, 2, 14, 23, 59, 59, 999))
  })

  it('sets boundary times correctly (start 00:00, end 23:59)', () => {
    const { start, end } = getCalendarRange(
      new Date('2025-11-01T00:00:00.000Z')
    )
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
  })
})
