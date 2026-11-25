import { EventChip } from '@common/components/Event/EventChip/EventChip'
import { HOVER_PREVIEW_DELAY_MS } from '@common/components/Event/EventChip/EventHoverPreview'
import { EventErrorHandler } from '@common/components/Error/EventErrorHandler'
import { EventDisplayInfo } from '@fullcalendar/react'
import { act, fireEvent, screen } from '@testing-library/react'
import React from 'react'
import { renderWithProviders } from '../../../utils/Renderwithproviders'

const calId = 'bob/cal1'

const preloadedState = {
  user: {
    userData: {
      email: 'alice@example.com',
      openpaasId: 'alice'
    }
  },
  calendars: {
    list: {
      [calId]: {
        id: calId,
        name: 'Team Alpha',
        color: { light: '#0B8043', dark: '#0B8043' },
        owner: { emails: ['bob@example.com'] }
      }
    },
    templist: {}
  }
}

const start = new Date('2026-11-11T09:00:00Z')
const end = new Date('2026-11-11T09:30:00Z')

const eventArg = (
  extendedProps: Record<string, unknown> = {},
  flags: Partial<EventDisplayInfo> = {}
): EventDisplayInfo =>
  ({
    event: {
      id: `${calId}/e1`,
      title: 'Quarterly roadmap review with Alice Martin',
      start,
      end,
      allDay: false,
      startStr: start.toISOString(),
      endStr: end.toISOString(),
      _def: {
        extendedProps: {
          uid: 'e1',
          calId,
          location: 'Room 4B',
          description: 'Agenda:\n<img src="x" data-testid="injected">Slides',
          ...extendedProps
        }
      },
      _instance: { range: { start, end } }
    },
    view: { type: 'timeGridWeek', calendar: { getOption: () => 'UTC' } },
    isDragging: false,
    isResizing: false,
    isMirror: false,
    ...flags
  }) as unknown as EventDisplayInfo

const renderChip = (arg: EventDisplayInfo): void => {
  renderWithProviders(
    <a className="fc-event" tabIndex={0} data-testid="event">
      <EventChip arg={arg} errorHandler={{} as EventErrorHandler} />
    </a>,
    preloadedState
  )
}

const mockHover = (canHover: boolean): void => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(hover: hover)' ? canHover : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn()
  }))
}

const hoverChip = (): void => {
  fireEvent.mouseOver(screen.getByTestId('event-card-e1'))
  act(() => {
    vi.advanceTimersByTime(HOVER_PREVIEW_DELAY_MS)
  })
}

describe('event hover preview', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockHover(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the full title, time, calendar, location and description after a delay', () => {
    renderChip(eventArg())

    fireEvent.mouseOver(screen.getByTestId('event-card-e1'))
    expect(screen.queryByTestId('event-hover-preview')).toBe(null)

    act(() => {
      vi.advanceTimersByTime(HOVER_PREVIEW_DELAY_MS)
    })

    const preview = screen.getByTestId('event-hover-preview')
    expect(preview).toHaveTextContent(
      'Quarterly roadmap review with Alice Martin'
    )
    expect(preview).toHaveTextContent('09:00')
    expect(preview).toHaveTextContent('09:30')
    expect(preview).toHaveTextContent('Team Alpha')
    expect(preview).toHaveTextContent('Room 4B')
    expect(preview).toHaveTextContent('Agenda:')
    expect(preview).toHaveTextContent('Slides')
  })

  it('shows the description as text, never as markup', () => {
    renderChip(eventArg())
    hoverChip()

    expect(screen.queryByTestId('injected')).toBe(null)
  })

  it('opens on keyboard focus of the event after a delay', () => {
    renderChip(eventArg())

    act(() => {
      screen.getByTestId('event').focus()
    })
    expect(screen.queryByTestId('event-hover-preview')).toBe(null)

    act(() => {
      vi.advanceTimersByTime(HOVER_PREVIEW_DELAY_MS)
    })

    expect(screen.getByTestId('event-hover-preview')).toBeInTheDocument()
  })

  it('closes when the event is pressed, so a click opens only the event', () => {
    renderChip(eventArg())
    hoverChip()

    fireEvent.mouseDown(screen.getByTestId('event'))
    // the exit transition
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.queryByTestId('event-hover-preview')).toBe(null)
  })

  it('stays closed when the event is pressed before the delay, until the pointer leaves it', () => {
    renderChip(eventArg())
    const card = screen.getByTestId('event-card-e1')

    fireEvent.mouseOver(card)
    fireEvent.mouseDown(screen.getByTestId('event'))
    act(() => {
      vi.advanceTimersByTime(HOVER_PREVIEW_DELAY_MS)
    })
    expect(screen.queryByTestId('event-hover-preview')).toBe(null)

    fireEvent.mouseLeave(screen.getByTestId('event'))
    fireEvent.mouseOut(card)
    hoverChip()
    expect(screen.getByTestId('event-hover-preview')).toBeInTheDocument()
  })

  it('opens on keyboard focus after a press, the pointer still on the event', () => {
    renderChip(eventArg())
    const eventEl = screen.getByTestId('event')
    fireEvent.mouseDown(eventEl)

    act(() => {
      eventEl.focus()
    })
    act(() => {
      vi.advanceTimersByTime(HOVER_PREVIEW_DELAY_MS)
    })

    expect(screen.getByTestId('event-hover-preview')).toBeInTheDocument()
  })

  it('shows nothing on a screen without hover', () => {
    mockHover(false)
    renderChip(eventArg())
    hoverChip()

    expect(screen.queryByTestId('event-hover-preview')).toBe(null)
  })

  it('shows nothing while the event is dragged', () => {
    renderChip(eventArg({}, { isDragging: true }))
    hoverChip()

    expect(screen.queryByTestId('event-hover-preview')).toBe(null)
  })

  it("hides the details of a private event of someone else's calendar", () => {
    renderChip(eventArg({ class: 'PRIVATE' }))
    hoverChip()

    const preview = screen.getByTestId('event-hover-preview')
    expect(preview).toHaveTextContent('Team Alpha')
    expect(preview).not.toHaveTextContent('Room 4B')
    expect(preview).not.toHaveTextContent('Slides')
  })
})
