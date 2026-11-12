import {
  createViewHandlers,
  ViewHandlersProps
} from '@common/components/Calendar/handlers/viewHandlers'
import { EventErrorHandler } from '@common/components/Error/EventErrorHandler'
import en from '@common/locales/en.json'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarApi, EventDisplayInfo } from '@fullcalendar/react'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('@common/components/Event/EventChip/EventChip', () => ({
  EventChip: () => <div>chip</div>
}))

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

const calId = 'bob/cal1'

const calendars = {
  [calId]: {
    id: calId,
    name: 'Work',
    color: { light: '#fff', dark: '#000' },
    owner: { emails: ['bob@open-paas.org'] }
  } as unknown as Calendar
}

const handlers = createViewHandlers({
  calendarRef: { current: null } as React.RefObject<CalendarApi | null>,
  setSelectedDate: vi.fn(),
  setSelectedMiniDate: vi.fn(),
  calendars,
  tempcalendars: {},
  errorHandler: {} as EventErrorHandler,
  timezone: 'Europe/Paris',
  isTablet: false,
  isMobile: false,
  t,
  userId: 'alice'
} as ViewHandlersProps)

const eventArg = (partstat: string): EventDisplayInfo =>
  ({
    event: {
      id: 'weekly/20261111',
      title: 'Weekly QA21',
      start: new Date('2026-11-11T18:00:00Z'),
      end: new Date('2026-11-11T19:00:00Z'),
      allDay: false,
      extendedProps: {
        calId,
        attendee: [{ cal_address: 'mailto:bob@open-paas.org', partstat }]
      }
    },
    view: { type: 'timeGridWeek' }
  }) as unknown as EventDisplayInfo

// FullCalendar renders the content inside the event element it keeps
const renderInEventElement = (
  content: React.ReactElement
): React.ReactElement => (
  <a className="fc-event" tabIndex={0} data-testid="event">
    {content}
  </a>
)

describe('event element answer', () => {
  it('follows an answer given after the element was mounted', () => {
    const { getByTestId, rerender } = render(
      renderInEventElement(
        handlers.handleEventContent(eventArg('NEEDS-ACTION'))
      )
    )
    expect(getByTestId('event').getAttribute('aria-label')).toBe(
      'Weekly QA21, Wednesday, 11 November 2026, 19:00 – 20:00, Work, Awaiting your response'
    )

    rerender(
      renderInEventElement(handlers.handleEventContent(eventArg('ACCEPTED')))
    )

    expect(getByTestId('event').getAttribute('role')).toBe('button')
    expect(getByTestId('event').getAttribute('aria-label')).toBe(
      'Weekly QA21, Wednesday, 11 November 2026, 19:00 – 20:00, Work'
    )
  })

  it('classes the element after the current answer', () => {
    expect(handlers.handleEventClass(eventArg('NEEDS-ACTION'))).toBe(
      'needs-action-event'
    )
    expect(handlers.handleEventClass(eventArg('DECLINED'))).toBe(
      'declined-event'
    )
    expect(handlers.handleEventClass(eventArg('ACCEPTED'))).toBe('')
  })
})
