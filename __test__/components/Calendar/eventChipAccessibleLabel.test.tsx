import { createViewHandlers } from '@common/components/Calendar/handlers/viewHandlers'
import { EventErrorHandler } from '@common/components/Error/EventErrorHandler'
import en from '@common/locales/en.json'
import { EventDisplayInfo, MountInfo } from '@fullcalendar/react'

const lookup = (key: string): string =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      en
    ) as string

const t = (key: string, vars?: Record<string, string>): string =>
  Object.entries(vars ?? {}).reduce(
    (text, [k, v]) => text.replace(`%{${k}}`, v),
    lookup(key)
  )

const handlers = createViewHandlers({
  calendarRef: { current: null },
  setSelectedDate: vi.fn(),
  setSelectedMiniDate: vi.fn(),
  calendars: {},
  tempcalendars: {},
  errorHandler: {} as EventErrorHandler,
  timezone: 'Europe/Paris',
  isTablet: false,
  isMobile: false,
  t
})

// What FullCalendar hands over in Europe/Paris: an all-day event starts at
// midnight Paris time, the day before in UTC
const mountChip = (event: Record<string, unknown>): HTMLElement => {
  const el = document.createElement('a')
  el.tabIndex = 0
  handlers.handleEventDidMount({
    el,
    event: { id: 'e1', title: 'Allday NT', extendedProps: {}, ...event },
    view: { type: 'timeGridWeek' }
  } as unknown as MountInfo<EventDisplayInfo>)
  return el
}

describe('event chip accessible label', () => {
  it('names a one-day all-day event with its day east of UTC', () => {
    const el = mountChip({
      allDay: true,
      start: new Date('2026-11-11T23:00:00Z'),
      end: new Date('2026-11-12T23:00:00Z'),
      startStr: '2026-11-12',
      endStr: '2026-11-13'
    })

    expect(el.getAttribute('aria-label')).toBe(
      'Allday NT, Thursday, 12 November 2026, All day, '
    )
  })

  it('names a multi-day all-day event with its days east of UTC', () => {
    const el = mountChip({
      allDay: true,
      start: new Date('2026-12-06T23:00:00Z'),
      end: new Date('2026-12-09T23:00:00Z'),
      startStr: '2026-12-07',
      endStr: '2026-12-10'
    })

    expect(el.getAttribute('aria-label')).toBe(
      'Allday NT, Monday, 7 December 2026 – Wednesday, 9 December 2026, All day, '
    )
  })

  it('names an all-day event without end with its day', () => {
    const el = mountChip({
      allDay: true,
      start: new Date('2026-11-11T23:00:00Z'),
      end: null,
      startStr: '2026-11-12',
      endStr: ''
    })

    expect(el.getAttribute('aria-label')).toBe(
      'Allday NT, Thursday, 12 November 2026, All day, '
    )
  })

  it('keeps naming a timed event in the user time zone', () => {
    const el = mountChip({
      allDay: false,
      start: new Date('2026-11-11T09:00:00Z'),
      end: new Date('2026-11-11T10:00:00Z'),
      startStr: '2026-11-11T10:00:00+01:00',
      endStr: '2026-11-11T11:00:00+01:00'
    })

    expect(el.getAttribute('aria-label')).toBe(
      'Allday NT, Wednesday, 11 November 2026, 10:00 – 11:00, '
    )
  })
})
