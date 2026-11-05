import { buildFromSelectedRange, formatEventDates } from './dateResolvers'
import type { CalendarEvent } from '@common/types/EventsTypes'
import type { DateSelectInfo } from '@fullcalendar/react'

const allDayRanges = [
  ['a normal date', '2026-09-30', '2026-10-02', '2026-10-01'],
  ['the spring DST transition', '2026-03-07', '2026-03-09', '2026-03-08']
] as const

function selectedRange(start: string, end: string): DateSelectInfo {
  return {
    start: new Date(start),
    end: new Date(end),
    startStr: start,
    endStr: end,
    allDay: true
  } as DateSelectInfo
}

describe('formatEventDates', () => {
  it.each(allDayRanges)(
    'converts the exclusive all-day end across %s',
    (_case, start, exclusiveEnd, inclusiveEnd) => {
      const event = {
        start,
        end: exclusiveEnd
      } as CalendarEvent

      expect(formatEventDates(event, true)).toEqual({
        start,
        end: inclusiveEnd
      })
    }
  )

  it.each(allDayRanges)(
    'keeps a selected all-day range across %s',
    (_case, start, exclusiveEnd, inclusiveEnd) => {
      expect(
        buildFromSelectedRange(selectedRange(start, exclusiveEnd), {})
      ).toMatchObject({
        start,
        end: inclusiveEnd,
        allday: true
      })
    }
  )

  it('formats in UTC a zone the browser does not know', () => {
    const event = {
      start: '2025-09-15T10:00:00Z',
      end: '2025-09-15T11:00:00Z',
      timezone: 'Mars/Olympus_Mons'
    } as CalendarEvent

    expect(formatEventDates(event, false)).toEqual({
      start: '2025-09-15T10:00',
      end: '2025-09-15T11:00'
    })
  })

  it('keeps existing events and selected ranges on the right day across the fall DST transition', () => {
    vi.stubEnv('TZ', 'America/New_York')
    try {
      const start = '2026-10-31'
      const end = '2026-11-02'
      expect(new Date(end).getTimezoneOffset()).toBe(300)
      expect(formatEventDates({ start, end } as CalendarEvent, true).end).toBe(
        '2026-11-01'
      )
      expect(buildFromSelectedRange(selectedRange(start, end), {}).end).toBe(
        '2026-11-01'
      )
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
