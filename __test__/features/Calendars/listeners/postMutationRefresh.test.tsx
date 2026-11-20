import type { AppDispatch } from '@common/app/store'
import reducer, {
  moveEvent,
  putEvent,
  refreshCalendarWithSyncToken
} from '@common/features/Calendars/CalendarSlice'
import { postMutationRefreshMiddleware } from '@common/features/Calendars/listeners/postMutationRefresh'
import { moveEventBetweenCalendars } from '@common/features/Events/updateEventHelpers/moveEventBetweenCalendars'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { configureStore, Middleware, UnknownAction } from '@reduxjs/toolkit'

vi.mock('@common/features/Calendars/CalendarDAO')
vi.mock('@common/features/Events/EventDao')
vi.mock('@common/features/Events/utils', async importOriginal => ({
  ...(await importOriginal<object>()),
  calendarEventToJCal: vi.fn(() => ['vcalendar', [], []])
}))

// Listener effects run after the action is processed: let them start.
const flushListeners = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

const calendar = (id: string, events = {}): Calendar =>
  ({
    id,
    name: id,
    link: `/calendars/${id}.json`,
    owner: { firstname: 'Alice', emails: ['alice@example.com'] },
    delegated: false,
    color: { light: '#006BD8', dark: '#FFF' },
    visibility: 'private',
    events
  }) as unknown as Calendar

const event: CalendarEvent = {
  uid: 'event1',
  title: 'Move404',
  start: '2024-01-01T10:00:00',
  end: '2024-01-01T11:00:00',
  calId: 'alice/alice',
  URL: '/calendars/alice/alice/event1.ics'
} as CalendarEvent

const myCalendar = calendar('alice/alice', { event1: event })
const perso = calendar('alice/perso')

function setup() {
  const actions: UnknownAction[] = []
  const recorder: Middleware = () => next => action => {
    actions.push(action as UnknownAction)
    return next(action)
  }
  const store = configureStore({
    reducer: { calendars: reducer },
    preloadedState: {
      calendars: {
        list: { [myCalendar.id]: myCalendar, [perso.id]: perso },
        templist: {},
        pending: false,
        error: null
      }
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({ serializableCheck: false })
        .prepend(postMutationRefreshMiddleware.middleware)
        .concat(recorder)
  })
  const refreshedCalendars = (): string[] =>
    actions
      .filter(refreshCalendarWithSyncToken.pending.match)
      .map(a => a.meta.arg.calendar.id)
  return { store, actions, refreshedCalendars }
}

describe('postMutationRefresh', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('refreshes the calendar of a saved event', async () => {
    const { store, refreshedCalendars } = setup()

    await store.dispatch(putEvent({ cal: myCalendar, newEvent: event }))
    await flushListeners()

    expect(refreshedCalendars()).toEqual([myCalendar.id])
  })

  it('does not refresh the calendar when the PUT asks to skip it', async () => {
    const { store, refreshedCalendars } = setup()

    await store.dispatch(
      putEvent({ cal: myCalendar, newEvent: event, skipRefresh: true })
    )
    await flushListeners()

    expect(refreshedCalendars()).toEqual([])
  })

  it('refreshes the calendars of a moved event only once the MOVE is done', async () => {
    const { store, actions, refreshedCalendars } = setup()

    await moveEventBetweenCalendars({
      dispatch: store.dispatch as AppDispatch,
      calList: { [myCalendar.id]: myCalendar, [perso.id]: perso },
      newEvent: event,
      oldCalId: myCalendar.id,
      newCalId: perso.id
    })
    await flushListeners()

    const firstRefresh = actions.findIndex(
      refreshCalendarWithSyncToken.pending.match
    )
    const moveDone = actions.findIndex(moveEvent.fulfilled.match)
    expect(moveDone).toBeGreaterThanOrEqual(0)
    expect(firstRefresh).toBeGreaterThan(moveDone)
    expect(refreshedCalendars().sort()).toEqual([myCalendar.id, perso.id])
  })
})
