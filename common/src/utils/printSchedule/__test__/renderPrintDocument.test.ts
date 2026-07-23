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

describe('renderPrintDocument', () => {
  it('renders one printable page per period with the event and auto-print script', () => {
    const periods = buildPrintPeriods(
      'week',
      dayjs('2026-07-22'),
      dayjs('2026-07-22')
    )
    const events = selectPrintEvents([makeEvent({})], 'Etc/UTC', LABELS.noTitle)

    const html = renderPrintDocument({
      periods,
      events,
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
    const events = selectPrintEvents([makeEvent({})], 'Etc/UTC', LABELS.noTitle)

    const html = renderPrintDocument({
      periods,
      events,
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
      events: [],
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
      events: [],
      locale: 'en',
      labels: LABELS
    })

    expect(html).toContain('mg-week')
    expect(html).toContain('mg-daynum')
  })

  it('escapes HTML-sensitive characters in event titles', () => {
    const events = selectPrintEvents(
      [makeEvent({ title: '<script>alert(1)</script>' })],
      'Etc/UTC',
      LABELS.noTitle
    )
    const periods = buildPrintPeriods(
      'day',
      dayjs('2026-07-22'),
      dayjs('2026-07-22')
    )

    const html = renderPrintDocument({
      periods,
      events,
      locale: 'en',
      labels: LABELS
    })

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
