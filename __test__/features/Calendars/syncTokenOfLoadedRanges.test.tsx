import reducer, {
  emptyEventsCal,
  getCalendarDetail
} from '@common/features/Calendars/CalendarSlice'
import { CalendarState } from '@common/features/Calendars/CalendarSlice'
import { Calendar } from '@common/types/CalendarTypes'

const token = (n: number): string => `http://sabre.io/ns/sync/${n}`

const stateWith = (syncToken?: string): CalendarState => ({
  list: {
    cal: { id: 'cal', events: {}, syncToken } as unknown as Calendar
  },
  templist: {},
  pending: false,
  error: null,
  isMobileSearchOpen: false
})

const loaded = (syncToken: string) =>
  getCalendarDetail.fulfilled({ calId: 'cal', events: [], syncToken }, 'req', {
    calId: 'cal',
    match: { start: '', end: '' }
  })

describe('the sync token of a calendar loaded range by range', () => {
  it('stays at the oldest range, so that a sync still brings what came after it', () => {
    // the week on screen was loaded at 3, the next one at 4: a change made in
    // between is in the second only, and a sync from 4 would never bring it
    const state = reducer(
      reducer(stateWith(), loaded(token(3))),
      loaded(token(4))
    )

    expect(state.list.cal.syncToken).toBe(token(3))
  })

  it('goes with the events when they are emptied', () => {
    const state = reducer(stateWith(token(3)), emptyEventsCal({ calId: 'cal' }))

    expect(state.list.cal.syncToken).toBeUndefined()
  })
})
