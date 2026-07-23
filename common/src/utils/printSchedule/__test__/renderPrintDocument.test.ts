import {
  buildPrintPeriods,
  PrintLabels,
  printDayjs as dayjs,
  renderPrintDocument,
  selectPrintEvents
} from '../index'
import { CalendarEvent } from '@common/types/EventsTypes'

const LABELS: PrintLabels = {
  documentTitle: 'Schedule',
  allDay: 'All day',
  noTitle: '(No title)',
  weekPrefix: 'Week',
  noEvents: 'No events'
}

const makeEvent = (overrides: Partial<CalendarEvent>): CalendarEvent =>
  ({
    uid: 'uid-1',
    calId: 'cal-1',
    start: '2026-07-22T09:00:00Z',
    end: '2026-07-22T10:00:00Z',
    attendee: [],
    timezone: 'Etc/UTC',
    title: 'Team sync',
    color: { light: '#336699' },
    ...overrides
  }) as CalendarEvent

const printEvents = (events: CalendarEvent[]) =>
  selectPrintEvents(events, 'Etc/UTC', LABELS.noTitle)

describe('renderPrintDocument', () => {
  it('renders one printable page per period with the event and auto-print script', () => {
    const periods = buildPrintPeriods(
      'week',
      dayjs('2026-07-22'),
      dayjs('2026-07-22')
    )

    const html = renderPrintDocument({
      periods,
      calendars: [{ events: printEvents([makeEvent({})]) }],
      locale: 'en',
      labels: LABELS
    })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Team sync')
    expect(html).toContain('page-break-after')
    expect(html).toContain('window.print()')
    expect(html).toContain('#336699')
  })

  it('renders an agenda list with the event when layout is schedule', () => {
    const periods = buildPrintPeriods(
      'week',
      dayjs('2026-07-22'),
      dayjs('2026-07-22')
    )

    const html = renderPrintDocument({
      periods,
      calendars: [{ events: printEvents([makeEvent({})]) }],
      locale: 'en',
      layout: 'schedule',
      labels: LABELS
    })

    expect(html).toContain('class="sc"')
    expect(html).toContain('Team sync')
    // Agenda layout skips the time-grid scaffold entirely.
    expect(html).not.toContain('class="tg-times"')
  })

  it('shows the no-events placeholder for an empty schedule period', () => {
    const periods = buildPrintPeriods(
      'week',
      dayjs('2026-07-22'),
      dayjs('2026-07-22')
    )

    const html = renderPrintDocument({
      periods,
      calendars: [{ events: [] }],
      locale: 'en',
      layout: 'schedule',
      labels: LABELS
    })

    expect(html).toContain('No events')
  })

  it('renders a month grid with day numbers at month scale', () => {
    const periods = buildPrintPeriods(
      'month',
      dayjs('2026-07-01'),
      dayjs('2026-07-31')
    )

    const html = renderPrintDocument({
      periods,
      calendars: [{ events: [] }],
      locale: 'en',
      labels: LABELS
    })

    expect(html).toContain('mg-week')
    expect(html).toContain('mg-daynum')
  })

  it('prints calendars side by side with their own headers at day scale', () => {
    const periods = buildPrintPeriods(
      'day',
      dayjs('2026-07-22'),
      dayjs('2026-07-22')
    )

    const html = renderPrintDocument({
      periods,
      calendars: [
        {
          events: printEvents([makeEvent({ title: 'Alpha' })]),
          heading: { calendarName: 'Cal A' }
        },
        {
          events: printEvents([makeEvent({ title: 'Beta' })]),
          heading: { calendarName: 'Cal B' }
        }
      ],
      locale: 'en',
      labels: LABELS
    })

    expect(html).toContain('class="cols-row"')
    expect(html).toContain('Cal A')
    expect(html).toContain('Cal B')
    expect(html).toContain('Alpha')
    expect(html).toContain('Beta')
  })

  it('merges calendars into a single grid at week scale', () => {
    const periods = buildPrintPeriods(
      'week',
      dayjs('2026-07-22'),
      dayjs('2026-07-22')
    )

    const html = renderPrintDocument({
      periods,
      calendars: [
        {
          events: printEvents([makeEvent({ title: 'Alpha' })]),
          heading: { calendarName: 'Cal A' }
        },
        {
          events: printEvents([makeEvent({ title: 'Beta' })]),
          heading: { calendarName: 'Cal B' }
        }
      ],
      locale: 'en',
      labels: LABELS
    })

    // One shared grid, no side-by-side columns; both events present.
    expect(html).not.toContain('class="cols-row"')
    expect(html).toContain('Alpha')
    expect(html).toContain('Beta')
    // Merged pages list every calendar name in the subtitle.
    expect(html).toContain('Cal A, Cal B')
  })

  it('escapes HTML-sensitive characters in event titles', () => {
    const periods = buildPrintPeriods(
      'day',
      dayjs('2026-07-22'),
      dayjs('2026-07-22')
    )

    const html = renderPrintDocument({
      periods,
      calendars: [
        {
          events: printEvents([
            makeEvent({ title: '<script>alert(1)</script>' })
          ])
        }
      ],
      locale: 'en',
      labels: LABELS
    })

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
