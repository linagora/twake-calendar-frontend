import { RootState } from '@common/app/store'
import RepeatEvent from '@common/components/Event/EventRepeat'
import * as eventThunks from '@common/features/Calendars/CalendarSlice'
import EventPopover from '@common/features/Events/EventModal'
import { RepetitionObject } from '@common/types/Repetition'
import { CalendarApi, DateSelectArg } from '@fullcalendar/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'
import { mockBrowserWestOfUtc } from '../utils/browserWestOfUtc'

const baseRepetition: RepetitionObject = {
  freq: '',
  interval: 1,
  occurrences: 0,
  endDate: ''
}

const mockOnClose = vi.fn()
const mockSetSelectedRange = vi.fn()
const mockCalendarRef = {
  current: { select: vi.fn() } as unknown as CalendarApi
}

const preloadedState = {
  user: {
    userData: {
      sub: 'test',
      email: 'test@test.com',
      sid: 'aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro',
      openpaasId: '667037022b752d0026472254'
    },
    organiserData: {
      cn: 'test',
      cal_address: 'test@test.com'
    }
  },
  calendars: {
    list: {
      '667037022b752d0026472254/cal1': {
        id: '667037022b752d0026472254/cal1',
        name: 'Calendar 1',
        color: '#FF0000'
      },
      '667037022b752d0026472254/cal2': {
        id: '667037022b752d0026472254/cal2',
        name: 'Calendar 2',
        color: '#00FF00'
      }
    },
    pending: false
  }
}

const defaultSelectedRange = {
  startStr: '2025-07-18T09:00',
  endStr: '2025-07-18T10:00',
  start: new Date('2025-07-18T09:00'),
  end: new Date('2025-07-18T10:00'),
  allDay: false,
  resource: undefined
} as unknown as DateSelectArg

function setupRepeatEvent(
  props?: Partial<RepetitionObject>,
  state?: RootState,
  eventStart: string = defaultSelectedRange.startStr
) {
  const setRepetition = vi.fn()
  renderWithProviders(
    <RepeatEvent
      repetition={{ ...baseRepetition, ...props }}
      eventStart={eventStart}
      setRepetition={setRepetition}
      isOwn={true}
    />,
    state
  )
  return { setRepetition }
}

async function setupEventPopover(
  selectedRange: DateSelectArg = defaultSelectedRange,
  timeZone = 'UTC'
) {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(
    'fixed-uuid-with-correct-format'
  )
  const originalDateResolvedOptions =
    new Intl.DateTimeFormat().resolvedOptions()
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...originalDateResolvedOptions,
    timeZone
  })

  renderWithProviders(
    <EventPopover
      open={true}
      onClose={mockOnClose}
      selectedRange={selectedRange}
      setSelectedRange={mockSetSelectedRange}
      calendarRef={mockCalendarRef}
    />,
    preloadedState
  )

  // Fill in title
  const titleInput = screen.getByLabelText('event.form.title')
  fireEvent.change(titleInput, { target: { value: 'Meeting' } })

  // Click More options to expand the dialog
  const showMoreButton = screen.getByRole('button', {
    name: 'common.moreOptions'
  })
  fireEvent.click(showMoreButton)

  // Check Repeat checkbox to show repeat options
  const repeatCheckbox = screen.getByLabelText('event.form.repeat')
  fireEvent.click(repeatCheckbox)

  // Wait for RepeatEvent component to be rendered
  await waitFor(() => {
    expect(screen.getByText('event.repeat.frequency.weeks')).toBeInTheDocument()
  })
}

async function expectRRule(
  expected: Partial<RepetitionObject>
): Promise<{ start: string }> {
  const spy = vi.spyOn(eventThunks, 'putEvent').mockImplementation(payload => {
    const promise = Promise.resolve(payload)
    ;(promise as any).unwrap = () => promise
    return () => promise as any
  })
  const saveButton = screen.getByRole('button', { name: /save/i })
  act(() => fireEvent.click(saveButton))
  await waitFor(() => expect(spy).toHaveBeenCalled())

  const received = spy.mock.calls[0][0]
  expect(received.newEvent.repetition).toMatchObject(expected)
  return received.newEvent
}

describe('RepeatEvent Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  it('renders with no repetition by default', () => {
    setupRepeatEvent()

    // Check that interval input shows default value
    const intervalInput = screen.getByTestId('repeat-interval')
    expect(intervalInput).toBeInTheDocument()

    // Check that frequency dropdown shows default value
    const frequencySelect = screen.getByRole('combobox')
    expect(frequencySelect).toBeInTheDocument()
  })

  it('gives the interval, end date and occurrences fields an accessible name', () => {
    setupRepeatEvent({ freq: 'daily' })

    expect(screen.getByTestId('repeat-interval')).toHaveAccessibleName(
      'event.repeat.repeatEvery'
    )
    expect(screen.getByTestId('event-repeat-end-date')).toHaveAccessibleName(
      'event.repeat.end.endDateAriaLabel'
    )
    expect(screen.getByTestId('occurrences-input')).toHaveAccessibleName(
      'event.repeat.end.occurrencesAriaLabel'
    )
  })

  it('gives the frequency select an accessible name', () => {
    setupRepeatEvent({ freq: 'weekly' })

    expect(
      screen.getByRole('combobox', { name: 'event.repeat.frequencyAriaLabel' })
    ).toBeInTheDocument()
  })

  it('widens the until date field so that a long date is not cut', () => {
    setupRepeatEvent({ freq: 'daily', endDate: '2026-12-30' })

    expect(screen.getByTestId('event-repeat-end-date')).toHaveValue(
      'Wednesday, December 30, 2026'
    )
    expect(screen.getByTestId('event-repeat-end-date-container')).toHaveStyle({
      width: 'calc(28ch + 40px)',
      minWidth: '220px'
    })
  })

  it('allows selecting repetition frequency', () => {
    const { setRepetition } = setupRepeatEvent()

    // Click on frequency dropdown
    const frequencySelect = screen.getByRole('combobox')
    fireEvent.mouseDown(frequencySelect)

    // Select Week(s)
    const weeklyOption = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.click(weeklyOption)

    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ freq: 'weekly' })
    )
  })

  it('proposes the weekday of an all-day start west of UTC', () => {
    mockBrowserWestOfUtc()
    // 2026-11-16 is a Monday
    const { setRepetition } = setupRepeatEvent(
      undefined,
      undefined,
      '2026-11-16'
    )

    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('event.repeat.frequency.weeks'))

    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ freq: 'weekly', byday: ['MO'] })
    )
  })

  it('renders interval input when frequency is selected', () => {
    setupRepeatEvent({ freq: 'daily' })

    const intervalInput = screen.getByTestId('repeat-interval')
    expect(intervalInput).toBeInTheDocument()
  })

  it('updates interval value', () => {
    const { setRepetition } = setupRepeatEvent()

    const intervalInput = screen.getByTestId('repeat-interval')
    fireEvent.change(intervalInput, { target: { value: '3' } })

    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ interval: 3 })
    )
    expect(
      screen.queryByTestId('repeat-interval-error')
    ).not.toBeInTheDocument()
  })

  it.each([
    ['0', 0],
    ['-2', -2],
    ['', 0],
    ['1000', 1000]
  ])(
    'flags interval %j as invalid instead of coercing it',
    (value, expected) => {
      const { setRepetition } = setupRepeatEvent({ freq: 'weekly' })

      const intervalInput = screen.getByTestId('repeat-interval')
      fireEvent.change(intervalInput, { target: { value } })

      expect(setRepetition).toHaveBeenCalledWith(
        expect.objectContaining({ interval: expected })
      )
      expect(intervalInput).toHaveValue(value === '' ? null : Number(value))
      expect(screen.getByTestId('repeat-interval-error')).toHaveTextContent(
        'event.validation.invalidRepeatInterval'
      )
    }
  )

  it('toggles day selection for weekly frequency', () => {
    const { setRepetition } = setupRepeatEvent({ freq: 'weekly' })

    const mondayChip = screen.getByLabelText('event.repeat.days.monday')
    fireEvent.click(mondayChip)

    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ byday: ['MO'] })
    )
  })
})

describe('Repeat Event Integration Tests', () => {
  // Increase timeout for all tests in this describe block
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  it('sends correct CalendarEvent payload for daily repeat', async () => {
    await setupEventPopover()

    // When Repeat checkbox is checked, repetition is set to empty object
    // We need to set the frequency manually
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const dailyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.days'
    })
    fireEvent.click(dailyOption)

    await expectRRule({ freq: 'daily', interval: 1 })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })

  it('sends correct API payload for repeat daily with 2 day interval', async () => {
    await setupEventPopover()

    // Ensure frequency is daily
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const dailyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.days'
    })
    fireEvent.click(dailyOption)

    // Set interval to 2
    const intervalInput = screen.getByTestId('repeat-interval')
    fireEvent.change(intervalInput, { target: { value: '2' } })

    await expectRRule({ freq: 'daily', interval: 2 })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })

  it('does not save the event when the interval is 0', async () => {
    await setupEventPopover()
    const spy = vi.spyOn(eventThunks, 'putEvent')

    const intervalInput = screen.getByTestId('repeat-interval')
    fireEvent.change(intervalInput, { target: { value: '0' } })

    expect(screen.getByTestId('repeat-interval-error')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
    })

    expect(spy).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('sends correct API payload for repeat daily for 5 repetitions', async () => {
    await setupEventPopover()

    // Ensure frequency is daily
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const dailyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.days'
    })
    fireEvent.click(dailyOption)

    // Select "After" end option
    const afterRadio = screen.getByLabelText(/after/i)
    fireEvent.click(afterRadio)

    // Set occurrences to 5
    const occurrencesInput = screen.getByTestId('occurrences-input')
    fireEvent.change(occurrencesInput, { target: { value: '5' } })

    await expectRRule({ freq: 'daily', interval: 1, occurrences: 5 })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })

  it('sends correct API payload for repeat daily until specific date', async () => {
    await setupEventPopover()

    // Ensure frequency is daily
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const dailyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.days'
    })
    fireEvent.click(dailyOption)

    // Select "On" end option
    const onRadio = screen
      .getAllByLabelText(/on/i)
      .find(el => el.type === 'radio')
    fireEvent.click(onRadio!)

    // End date is set by UI to some valid date string (YYYY-MM-DD)
    await expectRRule({
      freq: 'daily',
      interval: 1,
      endDate: expect.any(String)
    })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })

  it('sends correct API payload for repeat weekly on specific days', async () => {
    await setupEventPopover()

    // Select Week(s) frequency
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const weeklyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.weeks'
    })
    fireEvent.click(weeklyOption)

    // Select Thursday
    const thursdayCheckbox = screen.getByLabelText('event.repeat.days.thursday')
    fireEvent.click(thursdayCheckbox)

    await expectRRule({
      freq: 'weekly',
      interval: 1,
      byday: ['FR', 'TH']
    })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })

  it('keeps a weekly all-day series on the day picked west of UTC', async () => {
    mockBrowserWestOfUtc()
    // 2026-11-16 is a Monday
    await setupEventPopover(
      {
        startStr: '2026-11-16',
        endStr: '2026-11-17',
        start: new Date(2026, 10, 16),
        end: new Date(2026, 10, 17),
        allDay: true
      } as unknown as DateSelectArg,
      'America/New_York'
    )

    expect(screen.getByLabelText('event.repeat.days.monday')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByLabelText('event.repeat.days.sunday')).toHaveAttribute(
      'aria-pressed',
      'false'
    )

    const newEvent = await expectRRule({ freq: 'weekly', byday: ['MO'] })
    expect(newEvent.start).toMatch(/^2026-11-16/)
  })

  it('sends correct API payload for repeat weekly with 3 week interval', async () => {
    await setupEventPopover()

    // Select Week(s) frequency
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const weeklyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.weeks'
    })
    fireEvent.click(weeklyOption)

    // Set interval to 3
    const intervalInput = screen.getByTestId('repeat-interval')
    fireEvent.change(intervalInput, { target: { value: '3' } })

    await expectRRule({ freq: 'weekly', interval: 3 })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })

  it('sends correct API payload for repeat monthly', async () => {
    await setupEventPopover()

    // Select Month(s) frequency
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const monthlyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.months'
    })
    fireEvent.click(monthlyOption)

    await expectRRule({ freq: 'monthly', interval: 1 })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })

  it('sends correct API payload for repeat monthly and end after 5 occurrences', async () => {
    await setupEventPopover()

    // Select Month(s) frequency
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const monthlyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.months'
    })
    fireEvent.click(monthlyOption)

    // Select "After" end option
    const afterRadio = screen.getByLabelText(/after/i)
    fireEvent.click(afterRadio)

    // Set occurrences to 5
    const occurrencesInput = screen.getByTestId('occurrences-input')
    fireEvent.change(occurrencesInput, { target: { value: '5' } })

    await expectRRule({ freq: 'monthly', interval: 1, occurrences: 5 })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })

  it('sends correct API payload for repeat yearly', async () => {
    await setupEventPopover()

    // Select Year(s) frequency
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const yearlyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.years'
    })
    fireEvent.click(yearlyOption)

    await expectRRule({ freq: 'yearly', interval: 1 })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })

  it('sends correct API payload for repeat yearly with end option changes', async () => {
    await setupEventPopover()

    // Select Year(s) frequency
    const frequencySelect = screen.getByText('event.repeat.frequency.weeks')
    fireEvent.mouseDown(frequencySelect)
    const yearlyOption = screen.getByRole('option', {
      name: 'event.repeat.frequency.years'
    })
    fireEvent.click(yearlyOption)

    // First choose "After" with 5 occurrences
    const afterRadio = screen.getByLabelText(/after/i)
    fireEvent.click(afterRadio)
    const occurrencesInput = screen.getByTestId('occurrences-input')
    fireEvent.change(occurrencesInput, { target: { value: '5' } })

    // Then change mind and choose "Never"
    const neverRadio = screen.getByLabelText(/never/i)
    fireEvent.click(neverRadio)

    await expectRRule({
      freq: 'yearly',
      interval: 1
    })
    expect(mockOnClose).toHaveBeenCalledWith(true)
  })
})
