import {
  createEventHandlers,
  EventHandlersProps
} from '@common/components/Calendar/handlers/eventHandlers'
import * as eventThunks from '@common/features/Calendars/CalendarSlice'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import { EventClickArg } from '@fullcalendar/core'

const calId = '667037022b752d0026472254/cal1'

function storedEvent(
  uid: string,
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent {
  const event = {
    uid,
    calId,
    title: 'Meeting',
    start: '2025-03-15T10:00:00.000Z',
    end: '2025-03-15T11:00:00.000Z',
    timezone: 'UTC',
    URL: `/calendars/${calId}/${uid.split('/')[0]}.ics`,
    ...overrides
  }
  return event as CalendarEvent
}

const calendars: Record<string, Calendar> = {
  [calId]: {
    id: calId,
    events: {
      simple: storedEvent('simple'),
      'series/20250315T100000': storedEvent('series/20250315T100000'),
      'known-series/20250315T100000': storedEvent(
        'known-series/20250315T100000',
        { repetition: new RepetitionObject({ freq: 'weekly', interval: 1 }) }
      ),
      zoneless: storedEvent('zoneless', { timezone: undefined })
    }
  } as unknown as Calendar
}

function clickOn(uid: string): EventClickArg {
  const info = {
    jsEvent: { preventDefault: vi.fn(), target: document.body },
    el: document.body,
    event: { extendedProps: { uid, calId }, _def: { extendedProps: {} } }
  }
  return info as unknown as EventClickArg
}

function openEvent(uid: string): void {
  const handlers = createEventHandlers({
    dispatch: vi.fn(),
    calendars,
    setAnchorEl: vi.fn(),
    setSelectedRange: vi.fn(),
    setOpenEventDisplay: vi.fn(),
    setEventDisplayedId: vi.fn(),
    setEventDisplayedCalId: vi.fn(),
    setEventDisplayedTemp: vi.fn(),
    setSelectedEvent: vi.fn(),
    setAfterChoiceFunc: vi.fn(),
    setOpenEditModePopup: vi.fn(),
    setTempEvent: vi.fn()
  } as unknown as EventHandlersProps)

  handlers.handleEventClick(clickOn(uid))
}

/**
 * Opening an event used to read the whole event back, every single time. The
 * grid is filled by an expanded REPORT, and what that report leaves out is the
 * rule of a series, and the zone an event was written in when it states none.
 */
describe('Opening an event from the grid', () => {
  it('does not read a simple event again', () => {
    const getEvent = vi.spyOn(eventThunks, 'getEvent')

    openEvent('simple')

    expect(getEvent).not.toHaveBeenCalled()
  })

  it('does not read an occurrence whose repetition is already known', () => {
    const getEvent = vi.spyOn(eventThunks, 'getEvent')

    openEvent('known-series/20250315T100000')

    expect(getEvent).not.toHaveBeenCalled()
  })

  it('reads an occurrence that came without its repetition', () => {
    const getEvent = vi.spyOn(eventThunks, 'getEvent')

    openEvent('series/20250315T100000')

    expect(getEvent).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'series/20250315T100000' })
    )
  })

  it('reads an event that came without the zone it was written in', () => {
    const getEvent = vi.spyOn(eventThunks, 'getEvent')

    openEvent('zoneless')

    expect(getEvent).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'zoneless' })
    )
  })
})
