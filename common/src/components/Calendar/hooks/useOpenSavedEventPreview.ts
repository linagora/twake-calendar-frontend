import type { RefObject } from 'react'
import type { CalendarApi, EventApi } from '@fullcalendar/core'
import type { AppDispatch } from '@common/app/store'
import { getEventByUid } from '@common/features/Calendars/CalendarSlice'
import type { SavedEvent } from '@common/features/Events/eventSaveFeedbackSlice'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'

function hasSavedStart(start: string, saved: SavedEvent): boolean {
  return saved.allday
    ? start.slice(0, 10) === saved.start.slice(0, 10)
    : new Date(start).getTime() === new Date(saved.start).getTime()
}

function findSavedEvent<T extends { uid: string; start: string }>(
  events: T[],
  saved: SavedEvent
): T | undefined {
  return (
    events.find(event => event.uid === saved.uid) ??
    events.find(event => hasSavedStart(event.start, saved))
  )
}

function matchesSavedOccurrence(
  event: EventApi,
  saved: SavedEvent,
  targetUid?: string
): boolean {
  if (event.extendedProps.calId !== saved.calId) return false
  const uid = event.extendedProps.uid as string
  if (uid === saved.uid || uid === targetUid) return true
  if (extractEventBaseUuid(uid) !== extractEventBaseUuid(saved.uid))
    return false
  return saved.allday
    ? event.startStr.slice(0, 10) === saved.start.slice(0, 10)
    : event.start?.getTime() === new Date(saved.start).getTime()
}

export function useOpenSavedEventPreview({
  dispatch,
  userId,
  calendarRef,
  calendarWrapperRef,
  onOpen
}: {
  dispatch: AppDispatch
  userId: string
  calendarRef: RefObject<CalendarApi | null>
  calendarWrapperRef: RefObject<HTMLDivElement>
  onOpen: (eventId: string, calId: string, anchorEl: HTMLElement | null) => void
}): (event: SavedEvent) => Promise<void> {
  return async (saved): Promise<void> => {
    try {
      // Resolve the persisted event before opening: the new period's loader may
      // not have populated the store yet, and series use occurrence UIDs.
      const result = await dispatch(
        getEventByUid({
          userId,
          uid: extractEventBaseUuid(saved.uid),
          calId: saved.calId
        })
      ).unwrap()
      if (!result || result.calId !== saved.calId) return
      const target = findSavedEvent(result.events, saved)
      const chip = await waitForEventChip(
        calendarWrapperRef.current,
        calendarRef,
        saved,
        target?.uid
      )
      openSavedPreview({
        ...chip,
        targetUid: target?.uid,
        calId: result.calId,
        onOpen
      })
    } catch {
      // The lookup thunk reports loading failures through the existing snackbar.
    }
  }
}

function openSavedPreview({
  anchor,
  occurrence,
  targetUid,
  calId,
  onOpen
}: {
  anchor: HTMLElement | null
  occurrence?: EventApi
  targetUid?: string
  calId: string
  onOpen: (eventId: string, calId: string, anchorEl: HTMLElement | null) => void
}): void {
  const uid = (occurrence?.extendedProps.uid as string | undefined) ?? targetUid
  if (!uid) return
  anchor?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  onOpen(uid, calId, anchor)
}

// FullCalendar may render the new period after the lookup has completed.
function waitForEventChip(
  root: HTMLDivElement | null,
  calendarRef: RefObject<CalendarApi | null>,
  saved: SavedEvent,
  targetUid?: string
): Promise<{ anchor: HTMLElement | null; occurrence?: EventApi }> {
  const findChip = (): {
    anchor: HTMLElement | null
    occurrence?: EventApi
  } => {
    const events = calendarRef.current?.getEvents() ?? []
    const matches = events.filter(event =>
      matchesSavedOccurrence(event, saved, targetUid)
    )
    const anchor = root
      ? (Array.from(
          root.querySelectorAll<HTMLElement>('.fc-event[data-event-id]')
        ).find(element =>
          matches.some(event => event.id === element.dataset.eventId)
        ) ?? null)
      : null
    return {
      anchor,
      occurrence:
        matches.find(event => event.id === anchor?.dataset.eventId) ??
        matches[0]
    }
  }
  const existing = findChip()
  if (existing.anchor || !root) return Promise.resolve(existing)
  return new Promise(resolve => {
    const finish = (match: ReturnType<typeof findChip>): void => {
      observer.disconnect()
      clearTimeout(timeout)
      resolve(match)
    }
    const observer = new MutationObserver(() => {
      const match = findChip()
      if (match.anchor) finish(match)
    })
    const timeout = setTimeout(() => finish(findChip()), 2000)
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-event-id']
    })
  })
}
