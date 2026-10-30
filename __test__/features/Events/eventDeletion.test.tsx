import { setupStore } from '@common/app/store'
import * as calendarSlice from '@common/features/Calendars/CalendarSlice'
import * as EventDao from '@common/features/Events/EventDao'
import {
  commitEventDeletion,
  resumeUnsentDeletions,
  scheduleEventDeletion
} from '@common/features/Events/eventDeletion'
import { CalendarEvent } from '@common/types/EventsTypes'

const calId = 'user1/cal1'
const occurrence = {
  uid: 'series/20250315T100000',
  recurrenceId: '20250315T100000',
  calId,
  URL: '/calendars/user1/cal1/series.ics',
  start: '2025-03-15T10:00:00.000Z',
  attendee: []
} as unknown as CalendarEvent

const calendarWithOccurrence = {
  id: calId,
  name: 'Calendar',
  events: { [occurrence.uid]: occurrence }
}

const storageKey = 'pendingEventDeletions:user1'

const makeStore = (withCalendar = true, userId = 'user1') =>
  setupStore({
    user: { userData: { openpaasId: userId } },
    calendars: {
      list: withCalendar ? { [calId]: calendarWithOccurrence } : {},
      templist: {},
      pending: false,
      error: null,
      isMobileSearchOpen: false,
      pendingDeletions: []
    }
  } as never)

describe('event deletion', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    localStorage.clear()
  })

  const spyOnThunk = (name: 'deleteEvent' | 'deleteEventInstance') =>
    jest.spyOn(calendarSlice, name).mockImplementation(payload => {
      return () =>
        Promise.resolve({ type: `${name}/fulfilled`, payload }) as never
    })

  it('never deletes the whole series when one occurrence was asked', async () => {
    const deleteSeries = spyOnThunk('deleteEvent')
    // the calendar is gone by the time the undo window ends
    const store = makeStore(false)
    const id = store.dispatch(
      scheduleEventDeletion({ calId, event: occurrence, scope: 'solo' })
    )

    await store.dispatch(commitEventDeletion(id))

    expect(deleteSeries).not.toHaveBeenCalled()
    expect(store.getState().calendars.error).toBe(
      'TRANSLATION:error.deleteEventFailed'
    )
    expect(store.getState().calendars.pendingDeletions).toHaveLength(0)
  })

  it('sends at start the deletions a reload left unsent', async () => {
    const deleteOccurrence = spyOnThunk('deleteEventInstance')
    const before = makeStore()
    before.dispatch(
      scheduleEventDeletion({ calId, event: occurrence, scope: 'solo' })
    )

    // the page reloads: a new store, the same storage
    const after = makeStore()
    await after.dispatch(resumeUnsentDeletions())

    expect(deleteOccurrence).toHaveBeenCalledTimes(1)
    expect(deleteOccurrence.mock.calls[0][0]).toMatchObject({
      event: { uid: occurrence.uid }
    })
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('leaves the deletions of the current session to their undo', async () => {
    const deleteOccurrence = spyOnThunk('deleteEventInstance')
    const store = makeStore()
    store.dispatch(
      scheduleEventDeletion({ calId, event: occurrence, scope: 'solo' })
    )

    await store.dispatch(resumeUnsentDeletions())

    expect(deleteOccurrence).not.toHaveBeenCalled()
    expect(store.getState().calendars.pendingDeletions).toHaveLength(1)
  })

  it('keeps a deletion saved until the server answers it', async () => {
    let answer: () => void = () => {}
    jest.spyOn(calendarSlice, 'deleteEventInstance').mockImplementation(
      payload => () =>
        new Promise(resolve => {
          answer = () =>
            resolve({ type: 'deleteEventInstance/fulfilled', payload })
        }) as never
    )
    const store = makeStore()
    const id = store.dispatch(
      scheduleEventDeletion({ calId, event: occurrence, scope: 'solo' })
    )

    const commit = store.dispatch(commitEventDeletion(id))
    // a reload now would cut the request short: it is sent again at start
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '[]')).toHaveLength(1)

    answer()
    await commit
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('never sends the deletions another user left unsent', async () => {
    const deleteOccurrence = spyOnThunk('deleteEventInstance')
    makeStore(true, 'user1').dispatch(
      scheduleEventDeletion({ calId, event: occurrence, scope: 'solo' })
    )

    await makeStore(true, 'user2').dispatch(resumeUnsentDeletions())

    expect(deleteOccurrence).not.toHaveBeenCalled()
    expect(localStorage.getItem(storageKey)).not.toBeNull()
  })

  it('takes an event already gone from the server as deleted', async () => {
    jest
      .spyOn(EventDao, 'deleteEvent')
      .mockRejectedValue({ response: { status: 404 } })
    const store = makeStore()
    const id = store.dispatch(
      scheduleEventDeletion({ calId, event: occurrence, scope: 'all' })
    )

    await store.dispatch(commitEventDeletion(id))

    expect(store.getState().calendars.error).toBeNull()
    expect(store.getState().calendars.list[calId].events).toEqual({})
  })
})
