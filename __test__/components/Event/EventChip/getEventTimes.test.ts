/**
 * @vitest-environment jsdom
 */

import { getEventTimes } from '@common/components/Event/EventChip/EventChipUtils'
import { EventContentArg } from '@fullcalendar/core'
import 'moment-timezone'

vi.mock('@injected/components/Attendees/AttendeeActions', () => ({
  AttendeeActions: () => null
}))

vi.mock('@common/components/Event/EventChip/EventChip', () => ({
  EVENT_DURATION: { SHORT: 15, MEDIUM: 30, LONG: 60 }
}))

const eventOf = (start: string, end: string | null): EventContentArg['event'] =>
  ({
    start: new Date(start),
    end: end ? new Date(end) : null
  }) as EventContentArg['event']

describe('getEventTimes', () => {
  it('formats the start and the end in the time zone', () => {
    expect(
      getEventTimes(
        eventOf('2026-10-22T10:00:00Z', '2026-10-22T11:00:00Z'),
        'Europe/Paris'
      )
    ).toEqual({ startTime: '12:00', endTime: '13:00' })
  })

  it('has no end when FullCalendar dropped it (DTEND before DTSTART, #1712)', () => {
    expect(
      getEventTimes(eventOf('2026-10-22T10:00:00Z', null), 'Europe/Paris')
    ).toEqual({ startTime: '12:00', endTime: null })
  })

  it('has no end when the end precedes the start', () => {
    expect(
      getEventTimes(
        eventOf('2026-10-22T10:00:00Z', '2026-10-22T08:00:00Z'),
        'Europe/Paris'
      ).endTime
    ).toBeNull()
  })
})
