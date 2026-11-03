import type { Mock } from 'vitest'
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
const UID = 'f980a312'

const calendar: Calendar = {
  id: CAL_ID,
  name: 'Mine',
  link: '/calendars/user1/cal1.json',
  owner: { firstname: 'Me', emails: ['me@example.com'] },
  color: { light: '#006BD8', dark: '#FFF' },
  visibility: 'private',
  events: {}
}

const vtimezone = ['vtimezone', [['tzid', {}, 'text', 'Europe/Paris']], []]

const itemOf = (vevents: unknown[]) => ({
  _links: { self: { href: `/calendars/user1/cal1/${UID}.ics` } },
  etag: '"1"',
  status: 200,
  data: ['vcalendar', [], [...vevents, vtimezone]]
})

const occurrence = (start: string, end: string, recurrenceId: unknown[]) => [
  'vevent',
  [
    ['uid', {}, 'text', UID],
    ['summary', {}, 'text', 'Weekly'],
    ['dtstart', {}, 'date-time', start],
    ['dtend', {}, 'date-time', end],
    recurrenceId
  ],
  []
]

// 26 Oct - 1 Nov: nothing left to expand, the stored object comes back as is
const unexpandedWeek = itemOf([
  [
    'vevent',
    [
      ['uid', {}, 'text', UID],
      ['summary', {}, 'text', 'Weekly'],
      ['dtstart', {}, 'date-time', '2026-10-30T13:00:00Z'],
      ['dtend', {}, 'date-time', '2026-10-30T14:00:00Z'],
      ['rrule', {}, 'recur', { freq: 'WEEKLY', byday: 'FR' }]
    ],
    []
  ],
  occurrence('2026-11-02T13:00:00Z', '2026-11-02T14:00:00Z', [
    'recurrence-id',
    { tzid: 'Europe/Paris' },
    'date-time',
    '2026-10-30T14:00:00'
  ])
])

// 2 - 8 Nov: expanded
const expandedWeek = itemOf([
  occurrence('2026-11-02T13:00:00Z', '2026-11-02T14:00:00Z', [
    'recurrence-id',
    {},
    'date-time',
    '2026-10-30T13:00:00Z'
  ]),
  occurrence('2026-11-06T13:00:00Z', '2026-11-06T14:00:00Z', [
    'recurrence-id',
    {},
    'date-time',
    '2026-11-06T13:00:00Z'
  ])
])

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

const loadWeek = async (
  store: ReturnType<typeof storeFactory>,
  item: unknown,
  match: { start: string; end: string }
) => {
  ;(CalendarDAO.fetchCalendar as vi.Mock).mockResolvedValueOnce({
    _embedded: { 'dav:item': [item] }
  })
  await store.dispatch(getCalendarDetail({ calId: CAL_ID, match }))
}

describe('an occurrence moved out of its week, after a reload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is shown once, at its new place only', async () => {
    const store = storeFactory()

    await loadWeek(store, unexpandedWeek, {
      start: '20261026T000000',
      end: '20261102T000000'
    })
    await loadWeek(store, expandedWeek, {
      start: '20261102T000000',
      end: '20261109T000000'
    })

    const events = store.getState().calendars.list[CAL_ID].events
    expect(Object.keys(events).sort()).toEqual([
      `${UID}/2026-10-30T13:00:00Z`,
      `${UID}/2026-11-06T13:00:00Z`
    ])
    expect(events[`${UID}/2026-10-30T13:00:00Z`].start).toBe(
      '2026-11-02T13:00:00Z'
    )
  })

  it('keeps the stored RECURRENCE-ID on the occurrence read unexpanded', async () => {
    const store = storeFactory()

    await loadWeek(store, unexpandedWeek, {
      start: '20261026T000000',
      end: '20261102T000000'
    })

    const events = store.getState().calendars.list[CAL_ID].events
    expect(events[`${UID}/2026-10-30T13:00:00Z`].recurrenceId).toBe(
      '2026-10-30T14:00:00'
    )
  })
})
