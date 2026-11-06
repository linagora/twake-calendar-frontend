import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'
import { PendingDeletion } from '../types/PendingDeletion'

export const addPendingDeletionReducer = (
  create: ReducerCreators<CalendarState>
) =>
  create.reducer(
    (state: CalendarState, action: PayloadAction<PendingDeletion>) => {
      state.pendingDeletions = [
        ...(state.pendingDeletions ?? []),
        action.payload
      ]
    }
  )

export const markPendingDeletionCommittingReducer = (
  create: ReducerCreators<CalendarState>
) =>
  create.reducer((state: CalendarState, action: PayloadAction<string>) => {
    const deletion = state.pendingDeletions?.find(d => d.id === action.payload)
    if (deletion) deletion.committing = true
  })

export const removePendingDeletionReducer = (
  create: ReducerCreators<CalendarState>
) =>
  create.reducer((state: CalendarState, action: PayloadAction<string>) => {
    state.pendingDeletions = (state.pendingDeletions ?? []).filter(
      d => d.id !== action.payload
    )
  })
