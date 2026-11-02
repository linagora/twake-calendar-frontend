import { Calendar, EventInput } from '@fullcalendar/core'
import listPlugin from '@fullcalendar/list'
import { isVisibleInRange } from '@common/components/Event/EventChip/scheduleEventRange'

const activeStart = new Date('2026-10-30T00:00:00Z')
const activeEnd = new Date('2026-10-31T00:00:00Z')

describe('schedule event range', () => {
  let calendar: Calendar

  beforeEach(() => {
    calendar = new Calendar(document.createElement('div'), {
      plugins: [listPlugin],
      initialView: 'listDay',
      timeZone: 'UTC',
      defaultTimedEventDuration: '02:00',
      defaultAllDayEventDuration: { days: 2 }
    })
  })

  afterEach(() => calendar.destroy())

  it.each<[string, EventInput, boolean]>([
    [
      'timed default overlaps from the previous day',
      { start: '2026-10-29T23:00:00Z' },
      true
    ],
    [
      'timed default starts at the boundary',
      { start: '2026-10-30T00:00:00Z' },
      true
    ],
    [
      'all-day configured default overlaps',
      { start: '2026-10-29', allDay: true },
      true
    ],
    [
      'explicit exclusive end touches the boundary',
      { start: '2026-10-29T23:00:00Z', end: '2026-10-30T00:00:00Z' },
      false
    ],
    [
      'start touches the exclusive range end',
      { start: '2026-10-31T00:00:00Z' },
      false
    ],
    ['hidden event', { start: '2026-10-30T12:00:00Z', display: 'none' }, false]
  ])('%s', (_name, input, expected) => {
    const event = calendar.addEvent(input)
    if (!event) throw new Error('Expected FullCalendar to create the event')
    expect(isVisibleInRange(event, activeStart, activeEnd)).toBe(expected)
  })

  it('uses the standard one-day all-day default', () => {
    calendar.setOption('defaultAllDayEventDuration', { days: 1 })
    const event = calendar.addEvent({ start: '2026-10-30', allDay: true })
    if (!event) throw new Error('Expected FullCalendar to create the event')
    expect(event.end).toBeNull()
    if (!event) throw new Error('Expected FullCalendar to create the event')
    expect(isVisibleInRange(event, activeStart, activeEnd)).toBe(true)
  })
})
