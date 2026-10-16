import * as CalendarDAO from '@common/features/Calendars/CalendarDAO'
import reducer, {
  getEventByUid
} from '@common/features/Calendars/CalendarSlice'
import { Calendar } from '@common/types/CalendarTypes'
import { configureStore } from '@reduxjs/toolkit'

jest.mock('@common/features/Calendars/CalendarDAO', () => ({
  ...jest.requireActual('@common/features/Calendars/CalendarDAO'),
  fetchEventByUid: jest.fn()
}))

const TEAM_CAL_ID = 'team1/team1'
const PERSONAL_CAL_ID = 'alice/alice'

const calendar = (id: string): Calendar => ({
  id,
  name: id,
  link: `/calendars/${id}.json`,
  owner: { firstname: 'Owner', emails: ['owner@example.com'] },
  color: { light: '#006BD8', dark: '#FFF' },
  visibility: 'private',
  events: {}
})

// As loaded for a member: delegated, read through the member's own instance.
const teamCalendar = (id: string): Calendar => ({
  ...calendar(id),
  link: '/calendars/alice/instance1.json',
  delegated: true
})

const found = (calId: string) => ({
  _embedded: {
    'dav:item': [
      {
        _links: { self: { href: `/calendars/${calId}/event1.ics` } },
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
                ['summary', {}, 'text', 'Deep embed'],
                ['dtstart', {}, 'date-time', '2025-07-02T10:00:00Z'],
                ['dtend', {}, 'date-time', '2025-07-02T11:00:00Z']
              ],
              []
            ]
          ]
        ]
      }
    ]
  }
})

const notFound = () =>
  Object.assign(new Error('Not Found'), { response: { status: 404 } })

const storeFactory = () =>
  configureStore({
    reducer: { calendars: reducer },
    preloadedState: {
      calendars: {
        list: {
          [PERSONAL_CAL_ID]: calendar(PERSONAL_CAL_ID),
          [TEAM_CAL_ID]: teamCalendar(TEAM_CAL_ID)
        },
        templist: {},
        pending: false,
        error: null
      }
    }
  })

const fetchEventByUid = CalendarDAO.fetchEventByUid as jest.Mock

describe('getEventByUid on a team calendar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("looks in the team's home once the user's home does not hold the event", async () => {
    fetchEventByUid.mockImplementation((home: string) =>
      home === 'team1'
        ? Promise.resolve(found(TEAM_CAL_ID))
        : Promise.reject(notFound())
    )
    const store = storeFactory()

    const result = await store.dispatch(
      getEventByUid({ userId: 'alice', uid: 'event1' })
    )

    expect(fetchEventByUid.mock.calls.map(call => call[0])).toEqual([
      'alice',
      'team1'
    ])
    expect(result.payload).toEqual(
      expect.objectContaining({ calId: TEAM_CAL_ID })
    )
    expect(
      store.getState().calendars.list[TEAM_CAL_ID].events.event1.title
    ).toBe('Deep embed')
  })

  it("resolves an event found through the user's own instance", async () => {
    fetchEventByUid.mockResolvedValue(found('alice/instance1'))
    const store = storeFactory()

    const result = await store.dispatch(
      getEventByUid({ userId: 'alice', uid: 'event1' })
    )

    expect(result.payload).toEqual(
      expect.objectContaining({ calId: TEAM_CAL_ID })
    )
  })

  it('reports an event found in no home as not found', async () => {
    fetchEventByUid.mockRejectedValue(notFound())
    const store = storeFactory()

    await store.dispatch(getEventByUid({ userId: 'alice', uid: 'unknown' }))

    expect(fetchEventByUid).toHaveBeenCalledTimes(2)
    expect(store.getState().calendars.error).toBe(
      'TRANSLATION:error.eventNotFound'
    )
  })

  it('stops at the first error other than a missing event', async () => {
    fetchEventByUid.mockRejectedValue(
      Object.assign(new Error('Server Error'), { response: { status: 500 } })
    )
    const store = storeFactory()

    await store.dispatch(getEventByUid({ userId: 'alice', uid: 'event1' }))

    expect(fetchEventByUid).toHaveBeenCalledTimes(1)
    expect(store.getState().calendars.error).toBe('Server Error')
  })

  it('only asks the home of the embedded calendar', async () => {
    fetchEventByUid.mockResolvedValue(found(TEAM_CAL_ID))
    const store = storeFactory()

    const result = await store.dispatch(
      getEventByUid({ userId: 'alice', uid: 'event1', calId: TEAM_CAL_ID })
    )

    expect(fetchEventByUid).toHaveBeenCalledTimes(1)
    expect(fetchEventByUid).toHaveBeenCalledWith('team1', 'event1', undefined)
    expect(result.payload).toEqual(
      expect.objectContaining({ calId: TEAM_CAL_ID })
    )
  })

  it('does not resolve an event of another calendar for the embedded one', async () => {
    fetchEventByUid.mockResolvedValue(found(PERSONAL_CAL_ID))
    const store = storeFactory()

    const result = await store.dispatch(
      getEventByUid({ userId: 'alice', uid: 'event1', calId: TEAM_CAL_ID })
    )

    expect(result.payload).toBeNull()
    expect(store.getState().calendars.list[PERSONAL_CAL_ID].events).toEqual({})
  })
})
