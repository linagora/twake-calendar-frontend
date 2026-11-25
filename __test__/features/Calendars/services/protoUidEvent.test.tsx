import * as CalendarDAO from '@common/features/Calendars/CalendarDAO'
import reducer, {
  getCalendarDetail
} from '@common/features/Calendars/CalendarSlice'
import { Calendar } from '@common/types/CalendarTypes'
import { configureStore } from '@reduxjs/toolkit'

vi.mock('@common/features/Calendars/CalendarDAO', () => ({
  ...vi.importActual('@common/features/Calendars/CalendarDAO'),
  fetchCalendar: vi.fn()
}))

const CAL_ID = 'user1/cal1'

const calendar: Calendar = {
  id: CAL_ID,
  name: 'Mine',
  link: '/calendars/user1/cal1.json',
  owner: { firstname: 'Me', emails: ['me@example.com'] },
  color: { light: '#006BD8', dark: '#FFF' },
  visibility: 'private',
  events: {}
}

const itemOf = (uid: string) => ({
  _links: { self: { href: `/calendars/user1/cal1/${uid}.ics` } },
  etag: '"1"',
  status: 200,
  data: [
    'vcalendar',
    [],
    [
      [
        'vevent',
        [
          ['uid', {}, 'text', uid],
          ['summary', {}, 'text', uid],
          ['dtstart', {}, 'date-time', '2026-11-02T13:00:00Z'],
          ['dtend', {}, 'date-time', '2026-11-02T14:00:00Z']
        ],
        []
      ]
    ]
  ]
})

const storeFactory = () =>
  configureStore({
    reducer: { calendars: reducer },
    preloadedState: {
      calendars: {
        list: { [CAL_ID]: calendar },
        templist: {},
        pending: false,
        error: null
      }
    }
  })

describe('an event with UID:__proto__ (#2214)', () => {
  it('is skipped, the other events of the load still reach the store', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(CalendarDAO.fetchCalendar).mockResolvedValueOnce({
      _embedded: { 'dav:item': [itemOf('__proto__'), itemOf('meeting')] }
    })
    const store = storeFactory()

    const result = await store.dispatch(
      getCalendarDetail({
        calId: CAL_ID,
        match: { start: '20261102T000000', end: '20261109T000000' }
      })
    )

    expect(result.meta.requestStatus).toBe('fulfilled')
    const events = store.getState().calendars.list[CAL_ID].events
    expect(Object.keys(events)).toEqual(['meeting'])
    expect(Object.getPrototypeOf(events)).toBe(Object.prototype)
    consoleError.mockRestore()
  })
})
