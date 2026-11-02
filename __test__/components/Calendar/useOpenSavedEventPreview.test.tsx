import type { CalendarApi, EventApi } from '@fullcalendar/core'
import { act, renderHook } from '@testing-library/react'
import type { AppDispatch } from '@common/app/store'
import { getEventByUid } from '@common/features/Calendars/CalendarSlice'
import { useOpenSavedEventPreview } from '@common/components/Calendar/hooks/useOpenSavedEventPreview'
import type { SavedEvent } from '@common/features/Events/eventSaveFeedbackSlice'

jest.mock('@common/features/Calendars/CalendarSlice', () => ({
  getEventByUid: jest.fn(() => ({ type: 'lookupSavedEvent' }))
}))
const saved: SavedEvent = {
  uid: 'event',
  calId: 'user/calendar',
  start: '2026-10-26T10:00:00Z'
}
const setup = (
  unwrap: () => Promise<unknown>,
  root: HTMLDivElement | null = null,
  events: EventApi[] = []
) => {
  const dispatch = jest.fn(() => ({ unwrap }))
  const onOpen = jest.fn()
  const { result } = renderHook(() =>
    useOpenSavedEventPreview({
      dispatch: dispatch as unknown as AppDispatch,
      userId: 'user',
      calendarRef: {
        current: { getEvents: () => events } as unknown as CalendarApi
      },
      calendarWrapperRef: { current: root },
      onOpen
    })
  )
  return { open: result.current, dispatch, onOpen }
}

describe('Show saved event preview', () => {
  it('waits until the persisted event is loaded before opening its preview', async () => {
    let resolve!: (value: unknown) => void
    const pending = new Promise(done => {
      resolve = done
    })
    const { open, onOpen } = setup(() => pending)
    const opening = open(saved)
    expect(onOpen).not.toHaveBeenCalled()
    await act(async () => {
      resolve({ calId: saved.calId, events: [saved] })
      await opening
    })
    expect(getEventByUid).toHaveBeenCalledWith({
      userId: 'user',
      uid: 'event',
      calId: saved.calId
    })
    expect(onOpen).toHaveBeenCalledWith(saved.uid, saved.calId, null)
  })
  it('looks up the series base UID and opens the edited occurrence', async () => {
    const occurrence = { ...saved, uid: 'event/20261026T100000Z' }
    const { open, onOpen } = setup(async () => ({
      calId: saved.calId,
      events: [saved, occurrence]
    }))
    await act(async () => open(occurrence))
    expect(getEventByUid).toHaveBeenCalledWith({
      userId: 'user',
      uid: 'event',
      calId: saved.calId
    })
    expect(onOpen).toHaveBeenCalledWith(occurrence.uid, saved.calId, null)
  })
  it('finds the first series occurrence by saved start when the response contains expanded UIDs', async () => {
    const occurrence = {
      ...saved,
      uid: 'event/first',
      start: '2026-10-26T11:00:00+01:00'
    }
    const { open, onOpen } = setup(async () => ({
      calId: saved.calId,
      events: [
        { ...saved, uid: 'event/later', start: '2026-11-02T10:00:00Z' },
        occurrence
      ]
    }))
    await act(async () => open(saved))
    expect(onOpen).toHaveBeenCalledWith(occurrence.uid, saved.calId, null)
  })
  it('matches all-day lookup results by calendar date', async () => {
    const allDay = { ...saved, start: '2026-10-26', allday: true }
    const occurrence = {
      ...allDay,
      uid: 'event/first',
      start: '2026-10-26T00:00:00'
    }
    const { open, onOpen } = setup(async () => ({
      calId: saved.calId,
      events: [
        { ...occurrence, uid: 'event/later', start: '2026-10-27' },
        occurrence
      ]
    }))
    await act(async () => open(allDay))
    expect(onOpen).toHaveBeenCalledWith(occurrence.uid, saved.calId, null)
  })

  it('matches all-day rendered occurrences by date and calendar', async () => {
    const allDay = { ...saved, start: '2026-10-26', allday: true }
    const events = [
      {
        uid: 'event/other-calendar',
        calId: 'other/calendar',
        start: allDay.start
      },
      { uid: 'unrelated/first', calId: saved.calId, start: allDay.start },
      { uid: 'event/later', calId: saved.calId, start: '2026-10-27' },
      { uid: 'event/first', calId: saved.calId, start: allDay.start }
    ].map(({ uid, calId, start }) => ({
      id: uid,
      extendedProps: { uid, calId },
      startStr: start
    })) as unknown as EventApi[]
    const { open, onOpen } = setup(
      async () => ({ calId: saved.calId, events: [] }),
      null,
      events
    )
    await act(async () => open(allDay))
    expect(onOpen).toHaveBeenCalledWith('event/first', saved.calId, null)
  })

  it.each([
    null,
    { calId: 'other/calendar', events: [saved] },
    { calId: saved.calId, events: [] }
  ])(
    'does not open an unresolved event or a different calendar',
    async response => {
      const { open, onOpen } = setup(async () => response)
      await act(async () => open(saved))
      expect(onOpen).not.toHaveBeenCalled()
    }
  )
  it('anchors the preview to the matching chip after it renders in the new period', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    const events = [
      {
        id: `${saved.calId}/${saved.uid}`,
        extendedProps: { uid: saved.uid, calId: saved.calId }
      }
    ] as unknown as EventApi[]
    const { open, onOpen } = setup(
      async () => ({ calId: saved.calId, events: [saved] }),
      root,
      events
    )
    try {
      const opening = open(saved)
      await act(async () => {
        await Promise.resolve()
      })
      expect(onOpen).not.toHaveBeenCalled()
      const unrelated = document.createElement('a')
      unrelated.className = 'fc-event'
      unrelated.dataset.eventId = 'other/calendar/event'
      root.append(unrelated)
      const chip = document.createElement('a')
      chip.className = 'fc-event'
      chip.dataset.eventId = `${saved.calId}/${saved.uid}`
      const scroll = jest.fn()
      chip.scrollIntoView = scroll
      await act(async () => {
        root.append(chip)
        await opening
      })
      expect(onOpen).toHaveBeenCalledWith(saved.uid, saved.calId, chip)
      expect(scroll).toHaveBeenCalledWith({
        block: 'nearest',
        inline: 'nearest'
      })
    } finally {
      root.remove()
    }
  })

  it('anchors a series preview to its first occurrence rather than a later chip', async () => {
    const root = document.createElement('div')
    const events = ['2026-11-02T10:00:00Z', saved.start].map(
      (start, index) => ({
        id: `${saved.calId}/event/occurrence-${index}`,
        start: new Date(start),
        startStr: start,
        extendedProps: { calId: saved.calId, uid: `event/occurrence-${index}` }
      })
    ) as unknown as EventApi[]
    for (const event of events) {
      const chip = document.createElement('a')
      chip.className = 'fc-event'
      chip.dataset.eventId = event.id
      root.append(chip)
    }
    const { open, onOpen } = setup(
      async () => ({ calId: saved.calId, events: [saved] }),
      root,
      events
    )
    await act(async () => open(saved))
    expect(onOpen).toHaveBeenCalledWith(
      'event/occurrence-1',
      saved.calId,
      root.children[1]
    )
  })

  it('opens without an anchor when no chip becomes visible', async () => {
    jest.useFakeTimers()
    const root = document.createElement('div')
    const { open, onOpen } = setup(
      async () => ({ calId: saved.calId, events: [saved] }),
      root
    )
    try {
      const opening = open(saved)
      await act(async () => {
        await Promise.resolve()
      })
      await act(async () => {
        jest.advanceTimersByTime(2000)
        await opening
      })
      expect(onOpen).toHaveBeenCalledWith(saved.uid, saved.calId, null)
    } finally {
      jest.useRealTimers()
    }
  })

  it('opens the expanded saved occurrence when lookup returns only the master', async () => {
    const occurrence = { ...saved, uid: 'event/20261026T100000Z' }
    const master = { ...saved, start: '2026-10-19T10:00:00Z' }
    const events = [
      {
        id: 'occurrence-chip',
        extendedProps: { uid: occurrence.uid, calId: saved.calId },
        start: new Date(saved.start),
        startStr: saved.start
      }
    ] as unknown as EventApi[]
    const { open, onOpen } = setup(
      async () => ({ calId: saved.calId, events: [master] }),
      null,
      events
    )
    await act(async () => open(occurrence))
    expect(onOpen).toHaveBeenCalledWith(occurrence.uid, saved.calId, null)
  })

  it('waits for the expanded occurrence and uses its UID when only the master was fetched', async () => {
    const root = document.createElement('div')
    const events: EventApi[] = []
    const { open, onOpen } = setup(
      async () => ({
        calId: saved.calId,
        events: [{ ...saved, start: '2026-10-19T10:00:00Z' }]
      }),
      root,
      events
    )
    const opening = open({ ...saved, uid: 'event/saved-occurrence' })
    await act(async () => {
      await Promise.resolve()
    })
    expect(onOpen).not.toHaveBeenCalled()
    events.push({
      id: 'expanded-chip',
      extendedProps: { uid: 'event/expanded-occurrence', calId: saved.calId },
      start: new Date(saved.start),
      startStr: saved.start
    } as unknown as EventApi)
    const chip = document.createElement('a')
    chip.className = 'fc-event'
    chip.dataset.eventId = 'expanded-chip'
    await act(async () => {
      root.append(chip)
      await opening
    })
    expect(onOpen).toHaveBeenCalledWith(
      'event/expanded-occurrence',
      saved.calId,
      chip
    )
  })

  it('does not fall back to the master when the saved occurrence is unresolved', async () => {
    const { open, onOpen } = setup(async () => ({
      calId: saved.calId,
      events: [{ ...saved, start: '2026-10-19T10:00:00Z' }]
    }))
    await act(async () => open({ ...saved, uid: 'event/20261026T100000Z' }))
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('leaves lookup error reporting to the existing thunk', async () => {
    const { open, onOpen } = setup(async () => {
      throw new Error('Load failed')
    })
    await act(async () => open(saved))
    expect(onOpen).not.toHaveBeenCalled()
  })
})
