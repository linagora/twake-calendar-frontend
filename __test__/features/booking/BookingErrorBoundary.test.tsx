import { render, screen } from '@testing-library/react'
import { BookingErrorBoundary } from '@public/features/booking/components/BookingErrorBoundary'
import '@testing-library/jest-dom'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en-US'
  })
}))

jest.mock(
  '@/components/PublicLoadError',
  () => ({
    PublicLoadError: ({ title, detailMessage, action }: any) => (
      <div data-testid="public-load-error">
        <div>{title}</div>
        {detailMessage && <div>{detailMessage}</div>}
        {action && <div>{action}</div>}
      </div>
    )
  }),
  { virtual: true }
)

describe('BookingErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders generic error when errorStatus is string', () => {
    render(<BookingErrorBoundary errorStatus="Some generic error message" />)
    expect(screen.getByText('Some generic error message')).toBeInTheDocument()
  })

  it('renders notFound error when errorStatus is 404', () => {
    render(<BookingErrorBoundary errorStatus={404} />)
    expect(screen.getByText('booking.error.notFound')).toBeInTheDocument()
  })

  it('renders notAvailable error when errorStatus is 400', () => {
    render(<BookingErrorBoundary errorStatus={400} />)
    expect(screen.getByText('booking.error.notAvailable')).toBeInTheDocument()
  })

  it('renders ownerNoRights error when errorStatus is 403', () => {
    render(<BookingErrorBoundary errorStatus={403} />)
    expect(screen.getByText('booking.error.ownerNoRights')).toBeInTheDocument()
  })

  it('renders noLongerAvailable error and refresh button when errorStatus is 422', () => {
    render(<BookingErrorBoundary errorStatus={422} />)
    expect(
      screen.getByText('booking.error.noLongerAvailable')
    ).toBeInTheDocument()
    expect(screen.getByText('booking.error.refreshPage')).toBeInTheDocument()

    const refreshButton = screen.getByRole('button', {
      name: 'booking.error.refresh'
    })
    expect(refreshButton).toBeInTheDocument()
  })

  it('renders loadFailed error for unhandled numeric status on initial load', () => {
    render(<BookingErrorBoundary errorStatus={500} hasBookingInfo={false} />)
    expect(screen.getByText('booking.error.loadFailed')).toBeInTheDocument()
  })
})
