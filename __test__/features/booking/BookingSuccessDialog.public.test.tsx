import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BookingSuccessDialog } from '@public/features/booking/components/BookingSuccessDialog'
import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
    lang: 'en'
  })
}))

jest.mock('@public/features/booking/BookingDao', () => ({
  getBookedEvent: jest.fn()
}))

jest.mock(
  '@/components/Booking/BookingHeader/BookingOwnerInfo',
  () => ({ BookingOwnerDisplay: () => null }),
  { virtual: true }
)

const bookingInfo = {
  owner: { displayName: 'alice' },
  durationMinutes: 30
} as unknown as BookingSlotsResponse

const renderDialog = (slot: Slot, selectedTimezone: string): void => {
  render(
    <TwakeMuiThemeProvider>
      <BookingSuccessDialog
        open
        onClose={jest.fn()}
        selectedSlot={slot}
        bookingInfo={bookingInfo}
        selectedTimezone={selectedTimezone}
      />
    </TwakeMuiThemeProvider>
  )
}

describe('BookingSuccessDialog', () => {
  it('labels the slot with the offset in force on the meeting date', () => {
    renderDialog(
      { start: '2026-10-30T08:30:00Z', end: '2026-10-30T09:00:00Z' } as Slot,
      'Europe/Paris'
    )

    expect(screen.getByText(/booking\.success\.subtitle/)).toHaveTextContent(
      '"date":"Friday, October 30, 2026","time":"09:30"'
    )
    expect(screen.getByText('(UTC+1) Europe/Paris')).toBeInTheDocument()
  })

  it('formats the slot in the time zone selected on the page', () => {
    renderDialog(
      { start: '2026-10-30T15:00:00Z', end: '2026-10-30T15:30:00Z' } as Slot,
      'Asia/Tokyo'
    )

    expect(screen.getByText(/booking\.success\.subtitle/)).toHaveTextContent(
      '"date":"Saturday, October 31, 2026","time":"00:00"'
    )
    expect(screen.getByText('(UTC+9) Asia/Tokyo')).toBeInTheDocument()
  })
})
