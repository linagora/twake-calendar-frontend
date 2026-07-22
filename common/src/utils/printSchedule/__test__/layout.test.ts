import { PrintEvent } from '../types'
import { layoutTimedEvents } from '../layout'
import { printDayjs as dayjs } from '../index'

const timed = (uid: string, startHour: number, endHour: number): PrintEvent => ({
  uid,
  title: uid,
  start: dayjs(`2026-07-22T${String(startHour).padStart(2, '0')}:00:00Z`),
  end: dayjs(`2026-07-22T${String(endHour).padStart(2, '0')}:00:00Z`),
  allDay: false
})

describe('layoutTimedEvents', () => {
  it('places non-overlapping events in a single column', () => {
    const result = layoutTimedEvents([timed('a', 9, 10), timed('b', 11, 12)])

    expect(result.every(r => r.columns === 1 && r.column === 0)).toBe(true)
  })

  it('splits overlapping events into side-by-side columns', () => {
    const result = layoutTimedEvents([timed('a', 9, 11), timed('b', 10, 12)])

    expect(result.every(r => r.columns === 2)).toBe(true)
    expect(result.map(r => r.column).sort()).toEqual([0, 1])
  })

  it('reuses a freed column once an earlier event has ended', () => {
    const result = layoutTimedEvents([
      timed('a', 9, 10),
      timed('b', 9, 11),
      timed('c', 10, 12)
    ])
    const byUid = Object.fromEntries(result.map(r => [r.event.uid, r]))

    // c starts when a ends, so it reuses a's column rather than adding a third.
    expect(byUid.c.columns).toBe(2)
    expect(byUid.c.column).toBe(byUid.a.column)
  })
})
