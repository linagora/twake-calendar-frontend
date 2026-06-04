import { fetchSyncTokenChanges } from '@common/features/Calendars/CalendarDAO'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { expandEventFunction } from '@common/features/Calendars/utils/expandEventFunction'
import { processSyncUpdates } from '@common/features/Calendars/utils/processSyncTokenUpdates'
import { buildDelegatedEventURL } from '@common/features/Events/utils'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { toRejectedError } from '@common/utils/errorUtils'
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
      { rejectWithValue }
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

        const createdOrUpdatedEvents = await pMap(
          toExpand,
          expandEventFunction(calendarRange, calendar),
          { concurrency: maxConcurrency }
        )

        return {
          calId: calendar.id,
          deletedEvents: toDelete.map(eventURL =>
            calendar.delegated
              ? buildDelegatedEventURL(calendar, eventURL)
              : eventURL
          ),
          createdOrUpdatedEvents: createdOrUpdatedEvents
            .flat()
            .filter(Boolean) as CalendarEvent[],
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
        }
      },
      rejected: (state, action) => {
        state.pending = false
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to refresh calendar'
      }
    }
  )
