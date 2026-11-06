import type { AppDispatch, RootState } from '@common/app/store'
import {
  addPendingDeletion,
  deleteEvent,
  deleteEventInstance,
  markPendingDeletionCommitting,
  removeEvent,
  removePendingDeletion,
  setCalendarError
} from '@common/features/Calendars/CalendarSlice'
import { PendingDeletion } from '@common/features/Calendars/types/PendingDeletion'
import { CalendarEvent } from '@common/types/EventsTypes'
import { isRejected } from '@reduxjs/toolkit'

type Thunk<T> = (dispatch: AppDispatch, getState: () => RootState) => T

const STORAGE_KEY = 'pendingEventDeletions'

let nextDeletionId = 0

export function isHiddenByPendingDeletion(
  event: CalendarEvent,
  pendingDeletions: PendingDeletion[]
): boolean {
  return pendingDeletions.some(
    deletion =>
      deletion.calId === event.calId &&
      // every occurrence of a series shares the URL of its calendar object
      (deletion.scope === 'all'
        ? deletion.event.URL === event.URL
        : deletion.event.uid === event.uid)
  )
}

const findDeletion = (
  getState: () => RootState,
  id: string
): PendingDeletion | undefined =>
  getState().calendars.pendingDeletions?.find(d => d.id === id)

// One key per user: a deletion left unsent is only ever sent by its author
const storageKey = (getState: () => RootState): string | undefined => {
  const userId = getState().user?.userData?.openpaasId
  return userId ? `${STORAGE_KEY}:${userId}` : undefined
}

/**
 * The page may be reloaded or closed while a deletion waits for its undo or
 * for the server: the request is then lost, so every deletion the server has
 * not answered yet is kept here and sent again at the next start of the app.
 */
function saveUnsentDeletions(getState: () => RootState): void {
  const key = storageKey(getState)
  if (!key) return
  const unsent = getState().calendars.pendingDeletions ?? []
  try {
    if (unsent.length) localStorage.setItem(key, JSON.stringify(unsent))
    else localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to save the pending deletions:', error)
  }
}

function readSavedDeletions(getState: () => RootState): PendingDeletion[] {
  const key = storageKey(getState)
  if (!key) return []
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(saved) ? (saved as PendingDeletion[]) : []
  } catch {
    return []
  }
}

/**
 * Hides the event from the grid without telling the server yet, so that an
 * undo sends nothing: guests never get a cancellation followed by a new
 * invitation. Returns the id to commit or undo the deletion with.
 */
export const scheduleEventDeletion =
  ({
    calId,
    event,
    scope
  }: {
    calId: string
    event: CalendarEvent
    scope: 'solo' | 'all'
  }): Thunk<string> =>
  (dispatch, getState) => {
    const id = `deletion-${Date.now()}-${++nextDeletionId}`
    dispatch(
      addPendingDeletion({
        id,
        calId,
        event: { ...event, calId },
        scope,
        committing: false
      })
    )
    saveUnsentDeletions(getState)
    return id
  }

export const undoEventDeletion =
  (id: string): Thunk<void> =>
  (dispatch, getState) => {
    const deletion = findDeletion(getState, id)
    if (!deletion || deletion.committing) return
    dispatch(removePendingDeletion(id))
    saveUnsentDeletions(getState)
  }

/**
 * Sends the deletion. The event stays hidden while the request runs; on
 * failure it shows up again, next to the error the thunks report.
 */
export const commitEventDeletion =
  (id: string): Thunk<Promise<void>> =>
  async (dispatch, getState) => {
    const deletion = findDeletion(getState, id)
    if (!deletion || deletion.committing) return
    dispatch(markPendingDeletionCommitting(id))
    saveUnsentDeletions(getState)

    const { calId, event, scope } = deletion
    let succeeded = false
    if (scope === 'solo') {
      const calendar = getState().calendars.list[calId]
      // never fall back on deleting the URL: the whole series shares it
      if (calendar) {
        const result = await dispatch(
          deleteEventInstance({ cal: calendar, event })
        )
        succeeded = !isRejected(result)
      } else {
        dispatch(setCalendarError('TRANSLATION:error.deleteEventFailed'))
      }
    } else {
      const result = await dispatch(
        deleteEvent({ calId, eventId: event.uid, eventURL: event.URL })
      )
      succeeded = !isRejected(result)
    }

    if (succeeded) {
      // drop the occurrences now: the refresh that follows comes later
      Object.values(getState().calendars.list[calId]?.events ?? {})
        .filter(e => isHiddenByPendingDeletion(e, [deletion]))
        .forEach(e =>
          dispatch(removeEvent({ calendarUid: calId, eventUid: e.uid }))
        )
    }
    dispatch(removePendingDeletion(id))
    saveUnsentDeletions(getState)
  }

// Sends again the deletions a reload or a closed tab cut short. The ones of the
// current session wait for their undo as usual.
export const resumeUnsentDeletions =
  (): Thunk<Promise<void>> => async (dispatch, getState) => {
    const known = new Set(
      (getState().calendars.pendingDeletions ?? []).map(d => d.id)
    )
    await Promise.all(
      readSavedDeletions(getState)
        .filter(deletion => !known.has(deletion.id))
        .map(deletion => {
          dispatch(addPendingDeletion({ ...deletion, committing: false }))
          return dispatch(commitEventDeletion(deletion.id))
        })
    )
  }
