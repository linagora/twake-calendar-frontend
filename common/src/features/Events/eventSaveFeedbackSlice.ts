import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CalendarEvent } from '@common/types/EventsTypes'

export type SavedEvent = Pick<
  CalendarEvent,
  'uid' | 'calId' | 'start' | 'allday'
>

interface EventSaveFeedbackState {
  sequence: number
  notice: { id: number; event: SavedEvent; savedAt: number } | null
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
        state.notice = { id: ++state.sequence, ...action.payload }
      }
    },
    dismissEventSaveFeedback: (state, action: PayloadAction<number>) => {
      if (state.notice?.id === action.payload) state.notice = null
    }
  }
})

export const { eventSaved, dismissEventSaveFeedback } =
  eventSaveFeedbackSlice.actions
export default eventSaveFeedbackSlice.reducer
