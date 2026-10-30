import type { Mock } from 'vitest'
import * as CalendarDAO from '@common/features/Calendars/CalendarDAO'
import reducer, {
  getCalendarDetail,
  getEventByUid
} from '@common/features/Calendars/CalendarSlice'
import { Calendar } from '@common/types/CalendarTypes'
import { configureStore } from '@reduxjs/toolkit'

vi.mock('@common/features/Calendars/CalendarDAO', async () => ({
  ...(await vi.importActual('@common/features/Calendars/CalendarDAO')),
  fetchCalendar: vi.fn(),
  fetchEventByUid: vi.fn()
}))

const OWNER_CAL_ID = 'owner1/cal1'
const INSTANCE = '/calendars/sharee1/instance1'

const delegatedCalendar: Calendar = {
  id: OWNER_CAL_ID,
  name: 'Shared by owner',
  link: `${INSTANCE}.json`,
  owner: { firstname: 'Owner', emails: ['owner@example.com'] },
  delegated: true,
  color: { light: '#006BD8', dark: '#FFF' },
  visibility: 'private',
  events: {}
}

const item = {
  _links: { self: { href: `${INSTANCE}/event1.ics` } },
  etag: '"1"',
  status: 200,
  data: [
    'vcalendar',
    [],
    [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['summary', {}, 'text', 'Owner meeting'],
          ['dtstart', {}, 'date-time', '2025-07-02T10:00:00Z'],
          ['dtend', {}, 'date-time', '2025-07-02T11:00:00Z']
        ],
        []
      ]
    ]
  ]
}

const storeFactory = () =>
  configureStore({
    reducer: { calendars: reducer },
    preloadedState: {
      calendars: {
        list: { [OWNER_CAL_ID]: delegatedCalendar },
        templist: {},
        pending: false,
        error: null
      }
    }
  })

describe('reading a calendar shared with the user', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads the events of the time range through the sharee's instance", async () => {
    ;(CalendarDAO.fetchCalendar as Mock).mockResolvedValue({
      _embedded: { 'sync-token': 'token-1', 'dav:item': [item] }
    })
    const store = storeFactory()

    await store.dispatch(
      getCalendarDetail({
        calId: OWNER_CAL_ID,
        match: { start: '20250701T000000', end: '20250708T000000' }
      })
    )

    expect(CalendarDAO.fetchCalendar).toHaveBeenCalledWith(
      expect.objectContaining({ link: `${INSTANCE}.json`, delegated: true }),
      expect.anything(),
      undefined
    )
    const calendar = store.getState().calendars.list[OWNER_CAL_ID]
    expect(calendar.syncToken).toBe('token-1')
    expect(calendar.events.event1.calId).toBe(OWNER_CAL_ID)
    expect(calendar.events.event1.URL).toBe(`${INSTANCE}/event1.ics`)
  })

  it('resolves an event found by UID in the instance to the shared calendar', async () => {
    ;(CalendarDAO.fetchEventByUid as Mock).mockResolvedValue({
      _embedded: { 'dav:item': [item] }
    })
    const store = storeFactory()

    const result = await store.dispatch(
      getEventByUid({ userId: 'sharee1', uid: 'event1' })
    )

    expect(result.payload).toEqual(
      expect.objectContaining({ calId: OWNER_CAL_ID })
    )
    const calendar = store.getState().calendars.list[OWNER_CAL_ID]
    expect(calendar.events.event1.title).toBe('Owner meeting')
  })
})
