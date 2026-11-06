import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CalendarEvent } from '@common/types/EventsTypes'
import type { PartStat } from '@common/features/User/models/attendee'

export type SavedEvent = Pick<
  CalendarEvent,
  'uid' | 'calId' | 'start' | 'allday'
>

type SavedNotice = {
  kind: 'saved'
  id: number
  event: SavedEvent
  savedAt: number
}
type ParticipationNotice = {
  kind: 'participation'
  id: number
  partstat: PartStat
}

interface EventSaveFeedbackState {
  sequence: number
  notice: SavedNotice | ParticipationNotice | null
}

const initialState: EventSaveFeedbackState = { sequence: 0, notice: null }

const eventSaveFeedbackSlice = createSlice({
  name: 'eventSaveFeedback',
  initialState,
  reducers: {
    eventSaved: {
      prepare: ({ uid, calId, start, allday }: SavedEvent) => ({
        payload: { event: { uid, calId, start, allday }, savedAt: Date.now() }
      }),
      reducer: (
        state,
        action: PayloadAction<{ event: SavedEvent; savedAt: number }>
      ) => {
        state.notice = {
          kind: 'saved',
          id: ++state.sequence,
          ...action.payload
        }
      }
    },
    participationUpdated: (state, action: PayloadAction<PartStat>) => {
      state.notice = {
        kind: 'participation',
        id: ++state.sequence,
        partstat: action.payload
      }
    },
    dismissEventSaveFeedback: (state, action: PayloadAction<number>) => {
      if (state.notice?.id === action.payload) state.notice = null
    }
  }
})

export const { eventSaved, participationUpdated, dismissEventSaveFeedback } =
  eventSaveFeedbackSlice.actions
export default eventSaveFeedbackSlice.reducer
