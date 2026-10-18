import type { RootState } from '@common/app/store'
import { fetchSyncTokenChanges } from '@common/features/Calendars/CalendarDAO'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { expandEventFunction } from '@common/features/Calendars/utils/expandEventFunction'
import { processSyncUpdates } from '@common/features/Calendars/utils/processSyncTokenUpdates'
import { restoreSeriesRepetition } from '@common/features/Calendars/utils/restoreSeriesRepetition'
import { buildDelegatedEventURL } from '@common/features/Events/utils'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { toRejectedError, rejectedErrorMessage } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import pMap from 'p-map'
import { CalendarState } from '../CalendarSlice'

export interface SyncTokenUpdates {
  calId: string
  deletedEvents: string[]
  createdOrUpdatedEvents: CalendarEvent[]
  calType?: 'temp'
  syncToken?: string
  syncStatus?: string
}

function storedEvents(
  state: RootState,
  calId: string,
  calType?: 'temp'
): CalendarEvent[] {
  const calendars =
    calType === 'temp' ? state.calendars.templist : state.calendars.list
  return Object.values(calendars[calId]?.events ?? {})
}

export const refreshCalendarWithSyncToken = (
  create: ReducerCreators<CalendarState>
) =>
  create.asyncThunk<
    SyncTokenUpdates,
    {
      calendar: Calendar
      calType?: 'temp'
      calendarRange: { start: Date; end: Date }
      maxConcurrency?: number
    },
    { rejectValue: RejectedError }
  >(
    async (
      { calendar, maxConcurrency = 8, calendarRange, calType },
      { rejectWithValue, getState }
    ) => {
      try {
        if (!calendar?.syncToken) {
          return {
            calId: calendar.id,
            deletedEvents: [],
            createdOrUpdatedEvents: [],
            calType,
            syncStatus: 'NO_SYNC_TOKEN'
          }
        }

        const response = await fetchSyncTokenChanges(calendar)
        const newSyncToken = response['sync-token']
        const updates = response?._embedded?.['dav:item'] ?? []

        const { toDelete, toExpand } = processSyncUpdates(updates)

        const expandedEvents = await pMap(
          toExpand,
          expandEventFunction(calendarRange, calendar),
          { concurrency: maxConcurrency }
        )
        const createdOrUpdatedEvents = await restoreSeriesRepetition(
          expandedEvents.flat().filter(Boolean) as CalendarEvent[],
          storedEvents(getState() as RootState, calendar.id, calType),
          maxConcurrency
        )

        return {
          calId: calendar.id,
          deletedEvents: toDelete.map(eventURL =>
            calendar.delegated
              ? buildDelegatedEventURL(calendar, eventURL)
              : eventURL
          ),
          createdOrUpdatedEvents,
          calType,
          syncToken: newSyncToken,
          syncStatus: newSyncToken ? 'SUCCESS' : 'NO_NEW_SYNC_TOKEN'
        }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.pending = true
      },
      fulfilled: (state, action) => {
        state.pending = false
        state.error = null

        const {
          calId,
          deletedEvents,
          createdOrUpdatedEvents,
          calType,
          syncToken,
          syncStatus
        } = action.payload

        const target =
          calType === 'temp' ? state.templist[calId] : state.list[calId]

        if (!target) {
          return
        }

        if (syncStatus === 'SUCCESS') {
          const deletedSet = new Set(deletedEvents)
          Object.values(target.events)
            .filter(event => deletedSet.has(event.URL))
            .forEach(event => {
              delete target.events[event.uid]
            })

          for (const event of createdOrUpdatedEvents) {
            target.events[event.uid] = event
          }
          target.syncToken = syncToken

          // A changed event is only expanded over the displayed range: its
          // occurrences in the ranges already fetched elsewhere are missing,
          // so these ranges have to be loaded again. Not the displayed one,
          // which is up to date: loading it again would replace the events
          // just expanded, while they are being worked on.
          if (deletedEvents.length > 0 && calType !== 'temp') {
            target.lastRangesOutdated = Date.now()
          }
        }
      },
      rejected: (state, action) => {
        state.pending = false
        state.error = rejectedErrorMessage(
          action.payload,
          'TRANSLATION:error.loadEventsFailed'
        )
      }
    }
  )
