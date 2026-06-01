import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { fetchEvent } from '@common/features/Events/EventDao'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { formatReduxError } from '@common/utils/errorUtils'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const getEventThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    { calId: string; event: CalendarEvent },
    CalendarEvent,
    { rejectValue: RejectedError }
  >(
    async (event, { rejectWithValue }) => {
      try {
        const response = await fetchEvent(event)
        const fetchedEvent = parseFetchedEvent(event, response)

        return {
          calId: event.calId,
          event: fetchedEvent
        }
      } catch (err) {
        const error = err as { response?: { status?: number } }
        return rejectWithValue({
          message: formatReduxError(err),
          status: error.response?.status
        })
      }
    },
    {
      pending: state => {
        state.pending = true
      },
      settled: state => {
        state.pending = false
      },
      fulfilled: (state, action) => {
        if (!state.list[action.payload.calId]) {
          state.list[action.payload.calId] = {
            id: action.payload.calId,
            events: {}
          } as Calendar
        }
        if (
          Object.keys(state.list[action.payload.calId].events).find(
            (eventId: string) => {
              const eventIdBase = extractEventBaseUuid(eventId)
              return eventIdBase === action.payload.event.uid
            }
          )
        ) {
          Object.keys(state.list[action.payload.calId].events)
            .filter(eventKey => {
              const baseUid = extractEventBaseUuid(eventKey)
              return baseUid === action.payload.event.uid
            })
            .forEach(eventKey => {
              state.list[action.payload.calId].events[eventKey] = {
                ...state.list[action.payload.calId].events[eventKey],
                repetition: action.payload.event.repetition,
                timezone: action.payload.event.timezone
              }
            })
        } else {
          state.list[action.payload.calId].events[action.payload.event.uid] =
            action.payload.event
        }
      },
      rejected: (state, action) => {
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to load event'
      }
    }
  )
