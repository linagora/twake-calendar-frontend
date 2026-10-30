import { CalendarEvent } from '@common/types/EventsTypes'

// A deletion the user may still undo: its event stays in the store, hidden
// from the grid, until the request is sent and has succeeded
export interface PendingDeletion {
  id: string
  calId: string
  event: CalendarEvent
  // "solo" removes one occurrence of a series, "all" the whole event
  scope: 'solo' | 'all'
  committing: boolean
}
