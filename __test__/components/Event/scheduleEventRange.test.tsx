import { act, render } from '@testing-library/react'
import FullCalendar, {
  type CalendarApi,
  type EventInput
} from '@fullcalendar/react'
import listPlugin from '@fullcalendar/react/list'
import { isVisibleInRange } from '@common/components/Event/EventChip/scheduleEventRange'

const activeStart = new Date('2026-10-30T00:00:00Z')
const activeEnd = new Date('2026-10-31T00:00:00Z')

describe('schedule event range', () => {
  let calendar: CalendarApi

  beforeEach(() => {
    render(
      <FullCalendar
        ref={ref => {
          if (ref) calendar = ref.getApi()
        }}
        plugins={[listPlugin]}
        initialView="listDay"
        timeZone="UTC"
        defaultTimedEventDuration="02:00"
        defaultAllDayEventDuration={{ days: 2 }}
      />
    )
  })

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
    act(() => {
      calendar.addEvent(input)
    })
    const [event] = calendar.getEvents()
    if (!event) throw new Error('Expected FullCalendar to create the event')
    expect(isVisibleInRange(event, activeStart, activeEnd)).toBe(expected)
  })

  it('uses the standard one-day all-day default', () => {
    act(() => {
      calendar.setOption('defaultAllDayEventDuration', { days: 1 })
      calendar.addEvent({ start: '2026-10-30', allDay: true })
    })
    const [event] = calendar.getEvents()
    if (!event) throw new Error('Expected FullCalendar to create the event')
    expect(event.end).toBeNull()
    if (!event) throw new Error('Expected FullCalendar to create the event')
    expect(isVisibleInRange(event, activeStart, activeEnd)).toBe(true)
  })
})
