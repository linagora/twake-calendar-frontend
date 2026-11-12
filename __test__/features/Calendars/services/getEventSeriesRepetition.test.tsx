import type { Mock } from 'vitest'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import reducer, { getEvent } from '@common/features/Calendars/CalendarSlice'
import * as EventDao from '@common/features/Events/EventDao'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { configureStore } from '@reduxjs/toolkit'

vi.mock('@common/features/Events/EventDao')

// #2044: once a guest answers one occurrence alone, the object of the series
// may hold that overridden occurrence before its master
describe('getEvent on a series whose first VEVENT is an override', () => {
  const calId = 'bob/cal1'
  const URL = '/calendars/bob/cal1/weekly.ics'

  const occurrence = (recurrenceId: string): CalendarEvent =>
    ({
      uid: `weekly/${recurrenceId}`,
      recurrenceId,
      title: 'Weekly QA21',
      start: '2026-11-11T10:00:00Z',
      end: '2026-11-11T11:00:00Z',
      calId,
      URL,
      timezone: 'UTC'
    }) as CalendarEvent

  const vevent = (extraProps: VCalComponent[1]): VCalComponent => [
    'vevent',
    [
      ['uid', {}, 'text', 'weekly'],
      ['summary', {}, 'text', 'Weekly QA21'],
      ['dtstart', {}, 'date-time', '2026-11-11T10:00:00Z'],
      ['dtend', {}, 'date-time', '2026-11-11T11:00:00Z'],
      ...extraProps
    ],
    []
  ]

  const overrideFirst: VCalComponent = [
    'vcalendar',
    [],
    [
      vevent([['recurrence-id', {}, 'date-time', '2026-11-11T10:00:00Z']]),
      vevent([['rrule', {}, 'recur', { freq: 'WEEKLY', interval: 1 }]])
    ]
  ]

  const storeWith = (events: CalendarEvent[]) =>
    configureStore({
      reducer: { calendars: reducer },
      preloadedState: {
        calendars: {
          list: {
            [calId]: {
              id: calId,
              events: Object.fromEntries(events.map(e => [e.uid, e]))
            } as unknown as Calendar
          },
          templist: {},
          pending: false,
          error: null
        }
      }
    })

  beforeEach(() => {
    vi.resetAllMocks()
    ;(EventDao.fetchEvent as Mock).mockResolvedValue(overrideFirst)
  })

  it('gives every occurrence the rule of the master', async () => {
    const answered = occurrence('20261111T100000')
    const next = occurrence('20261118T100000')
    const store = storeWith([answered, next])

    await store.dispatch(getEvent(answered))

    const events = store.getState().calendars.list[calId].events
    expect(events[answered.uid].repetition?.freq).toBe('weekly')
    expect(events[next.uid].repetition?.freq).toBe('weekly')
  })

  it('adds no entry for the overridden occurrence it read', async () => {
    const answered = occurrence('20261111T100000')
    const store = storeWith([answered])

    await store.dispatch(getEvent(answered))

    expect(Object.keys(store.getState().calendars.list[calId].events)).toEqual([
      answered.uid
    ])
  })
})
