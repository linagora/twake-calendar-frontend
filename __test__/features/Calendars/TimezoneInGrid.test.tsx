import CalendarLayout from '@private/components/Calendar/CalendarLayout'
import { updateSlotLabelVisibility } from '@common/components/Calendar/utils/calendarUtils'
import EventPreviewModal from '@common/components/EventPreview'
import { CalendarEvent } from '@common/types/EventsTypes'
import * as SettingsSlice from '@common/features/Settings/SettingsSlice'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'
import type { ViewApi } from '@fullcalendar/react'

describe('Calendar - Timezone Integration', () => {
  const mockCalendarRef = { current: null }

  const baseState = {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        sid: 'testSid',
        openpaasId: 'user1'
      }
    },
    calendars: {
      list: {
        'user1/cal1': {
          id: 'user1/cal1',
          link: '/calendars/user1/cal1.json',
          name: 'Test Calendar',
          description: '',
          color: '#33B679',
          owner: { firstname: 'user1', emails: ['test@test.com'] },
          visibility: 'public',
          events: {}
        }
      },
      timeZone: 'America/New_York',
      pending: false
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Typing filters the ~400 zones down to a few: a role query over all of
  // them takes seconds, and timed out on a loaded machine
  const chooseTimeZone = async (city: string): Promise<void> => {
    fireEvent.click(await screen.findByText(/UTC/i))
    const autocomplete = await screen.findByRole('combobox')
    await waitFor(() => expect(autocomplete).toHaveFocus())
    fireEvent.change(autocomplete, { target: { value: city } })
    fireEvent.click(
      await screen.findByRole('option', { name: new RegExp(city, 'i') })
    )
  }

  it('renders TimezoneSelector in week view', async () => {
    renderWithProviders(<CalendarLayout />, baseState)

    // Look for timezone selector button (should show offset)
    await waitFor(() => {
      expect(screen.getByText(/UTC/)).toBeInTheDocument()
    })
  })

  it('dispatches setTimeZone action when timezone is changed', async () => {
    const setTimeZoneSpy = vi.spyOn(SettingsSlice, 'setTimeZone')

    renderWithProviders(<CalendarLayout />, baseState)

    await chooseTimeZone('Tokyo')

    expect(setTimeZoneSpy).toHaveBeenCalledWith('Asia/Tokyo')
  })

  it('bugfix : temp timezone opens event with the time offseted', async () => {
    const setTimeZoneSpy = vi.spyOn(SettingsSlice, 'setTimeZone')

    renderWithProviders(<CalendarLayout />, baseState)

    await chooseTimeZone('Jakarta')

    expect(setTimeZoneSpy).toHaveBeenCalledWith('Asia/Jakarta')

    const slot = document.querySelector('[data-time="14:00:00"]')

    expect(slot).toBeInTheDocument()

    fireEvent.mouseDown(slot!)
    fireEvent.mouseMove(slot!)
    fireEvent.mouseUp(slot!)

    await waitFor(() => {
      expect(window.__calendarRef?.current).toBeTruthy()
    })

    const calendarApi = window.__calendarRef.current

    act(() => {
      calendarApi?.select({
        start: '2026-05-11T14:00:00',
        end: '2026-05-11T14:30:00'
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('14:00 - 14:30')).toBeInTheDocument()
    })
  })
})

describe('Calendar - Timezone Slot Label Visibility', () => {
  // The week of 2025-01-13 in UTC, the time grid shows it with its now
  // indicator when the current time falls in it
  const makeView = (
    currentStart = new Date('2025-01-13T00:00:00Z'),
    currentEnd = new Date('2025-01-20T00:00:00Z'),
    hiddenDays: number[] = []
  ): ViewApi =>
    ({
      currentStart,
      currentEnd,
      calendar: { getOption: () => hiddenDays }
    }) as unknown as ViewApi

  const slot = (text: string, view = makeView()) => ({ text, view })

  it('hides slot labels within 15 minutes of current time', () => {
    const currentTime = new Date('2025-01-15T14:30:00Z')
    const timezone = 'UTC'

    // 14:25 - within 15 minutes
    expect(
      updateSlotLabelVisibility(currentTime, slot('14:25'), timezone)
    ).toBe('timegrid-slot-label-hidden')

    // 14:30 - exact match
    expect(
      updateSlotLabelVisibility(currentTime, slot('14:30'), timezone)
    ).toBe('timegrid-slot-label-hidden')

    // 14:35 - within 15 minutes
    expect(
      updateSlotLabelVisibility(currentTime, slot('14:35'), timezone)
    ).toBe('timegrid-slot-label-hidden')
  })

  it('shows slot labels more than 15 minutes from current time', () => {
    const currentTime = new Date('2025-01-15T14:30:00Z')
    const timezone = 'UTC'

    // 14:00 - 30 minutes before
    expect(
      updateSlotLabelVisibility(currentTime, slot('14:00'), timezone)
    ).toBe('fc-timegrid-slot-label')

    // 15:00 - 30 minutes after
    expect(
      updateSlotLabelVisibility(currentTime, slot('15:00'), timezone)
    ).toBe('fc-timegrid-slot-label')
  })

  it('compares the slot label with the current time in the calendar timezone', () => {
    // 14:30 in UTC is 09:30 in New York
    const currentTime = new Date('2025-01-15T14:30:00Z')

    expect(
      updateSlotLabelVisibility(currentTime, slot('09:30'), 'America/New_York')
    ).toBe('timegrid-slot-label-hidden')
    expect(
      updateSlotLabelVisibility(currentTime, slot('14:30'), 'America/New_York')
    ).toBe('fc-timegrid-slot-label')
  })

  it('returns visible class when not in current week/day', () => {
    const currentTime = new Date('2025-01-22T14:30:00Z')

    const result = updateSlotLabelVisibility(currentTime, slot('14:30'), 'UTC')
    expect(result).toBe('fc-timegrid-slot-label')
  })

  it('returns visible class when today is a hidden day of the week', () => {
    // 2025-01-18 is a Saturday
    const currentTime = new Date('2025-01-18T14:30:00Z')
    const view = makeView(undefined, undefined, [0, 6])

    expect(
      updateSlotLabelVisibility(currentTime, slot('14:30', view), 'UTC')
    ).toBe('fc-timegrid-slot-label')
  })
})

describe('EventDisplayPreview - Timezone Display', () => {
  const mockOnClose = vi.fn()

  const baseEvent: CalendarEvent = {
    uid: 'event1',
    title: 'Team Meeting',
    start: new Date('2025-01-15T14:00:00Z'),
    end: new Date('2025-01-15T15:00:00Z'),
    calendarId: 'user1/cal1',
    allday: false
  }

  const allDayEvent = {
    ...baseEvent,
    allday: true,
    start: new Date('2025-01-15'),
    end: new Date('2025-01-16')
  }

  const baseState = {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        sid: 'testSid',
        openpaasId: 'user1'
      }
    },
    calendars: {
      list: {
        'user1/cal1': {
          id: 'user1/cal1',
          name: 'Test Calendar',
          color: '#33B679',
          owner: { firstname: 'user1', emails: ['test@test.com'] },
          visibility: 'public',
          events: {
            event1: baseEvent,
            allDayEvent
          }
        }
      },
      timeZone: 'America/New_York',
      pending: false
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not show timezone offset for all-day events', async () => {
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        eventId="allDayEvent"
        calId="user1/cal1"
      />,
      baseState
    )

    await waitFor(() => {
      const title = screen.getByText(/Team Meeting/i)
      expect(title).toBeInTheDocument()
    })

    // Should not show UTC offset
    expect(screen.queryByText(/UTC[+-]\d+/i)).not.toBeInTheDocument()
  })

  it('displays correct timezone offset for different timezones', async () => {
    const timezones = [
      { tz: 'America/New_York', expectedOffset: /UTC[-−][45]/ },
      { tz: 'Europe/Paris', expectedOffset: /UTC\+[12]/ },
      { tz: 'Asia/Tokyo', expectedOffset: /UTC\+9/ },
      { tz: 'Australia/Sydney', expectedOffset: /UTC\+1[01]/ },
      { tz: 'Asia/Kolkata', expectedOffset: /UTC\+5:30/ }
    ]

    for (const { tz, expectedOffset } of timezones) {
      const state = {
        ...baseState,
        settings: {
          timeZone: tz
        }
      }

      renderWithProviders(
        <EventPreviewModal
          open={true}
          eventId="event1"
          calId="user1/cal1"
          onClose={mockOnClose}
        />,
        state
      )

      await waitFor(() => {
        const content = document.body.textContent || ''
        expect(content).toMatch(expectedOffset)
      })
    }
  })
})
