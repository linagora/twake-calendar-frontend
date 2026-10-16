import { fireEvent, render as rtlRender, screen } from '@testing-library/react'
import { BookingTimeSlotSection } from '@public/components/Booking/BookingTimeSlotSection'
import dayjs from 'dayjs'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'

// The components read the CSS variables of the twake-mui theme
const render = (ui: React.ReactElement): ReturnType<typeof rtlRender> =>
  rtlRender(ui, { wrapper: TwakeMuiThemeProvider })

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en-US'
  })
}))

jest.mock('@common/features/Search/searchResultsComponents', () => ({
  DayBadge: ({ dayNum, dayName }: { dayNum: string; dayName: string }) => (
    <div data-testid="day-badge">
      {dayName} {dayNum}
    </div>
  )
}))

describe('BookingTimeSlotSection', () => {
  it('asks the user to select a day when no day is selected', () => {
    render(
      <BookingTimeSlotSection
        selectedDay={null}
        slots={[]}
        selectedSlot={null}
        onSelectSlot={jest.fn()}
        selectedTimezone="UTC"
      />
    )

    expect(screen.getByText('booking.selectDayPrompt')).toBeInTheDocument()
  })

  it('shows an empty state when the selected day has no slots', () => {
    render(
      <BookingTimeSlotSection
        selectedDay={dayjs('2036-01-26T00:00:00.000Z')}
        slots={[]}
        selectedSlot={null}
        onSelectSlot={jest.fn()}
        selectedTimezone="UTC"
      />
    )

    expect(screen.getByText('booking.noSlots')).toBeInTheDocument()
  })

  it('renders available slots and calls onSelectSlot with the selected slot', async () => {
    const onSelectSlot = jest.fn()
    const firstSlot = { start: '2036-01-26T09:00:00.000Z' }
    const secondSlot = { start: '2036-01-26T09:30:00.000Z' }

    render(
      <BookingTimeSlotSection
        selectedDay={dayjs('2036-01-26T00:00:00.000Z')}
        slots={[firstSlot, secondSlot]}
        selectedSlot={secondSlot}
        onSelectSlot={onSelectSlot}
        selectedTimezone="UTC"
      />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    // 09:00:00 in UTC
    expect(screen.getByText('09:00')).toBeInTheDocument()

    fireEvent.click(buttons[0])

    expect(onSelectSlot).toHaveBeenCalledWith(firstSlot)
  })

  it('renders available slots in the selected timezone', async () => {
    const firstSlot = { start: '2036-01-26T09:00:00.000Z' } // 09:00 UTC
    // UTC+9 for Asia/Tokyo = 18:00

    render(
      <BookingTimeSlotSection
        selectedDay={dayjs('2036-01-26T00:00:00.000Z')}
        slots={[firstSlot]}
        selectedSlot={null}
        onSelectSlot={jest.fn()}
        selectedTimezone="Asia/Tokyo"
      />
    )

    expect(screen.getByText('18:00')).toBeInTheDocument()
  })
})
