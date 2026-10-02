import { BookingConfirmDialog } from '@public/features/booking/components/BookingDialog'
import { setHighContrastEnabled } from '@common/features/Settings/Accessibility/highContrastMode'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

// the "@/" alias of the public app is not mapped for unit tests
jest.mock(
  '@/components/Booking/BookingHeader/BookingOwnerInfo',
  () => ({ BookingOwnerDisplay: () => null }),
  { virtual: true }
)

jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'en' })
}))

const renderDialog = (onConfirm = jest.fn().mockResolvedValue(undefined)) => {
  render(
    <TwakeMuiThemeProvider>
      <BookingConfirmDialog
        open
        onClose={jest.fn()}
        selectedSlot={{ start: '2036-01-26T09:00:00.000Z' }}
        bookingInfo={null}
        onConfirm={onConfirm}
        selectedTimezone="UTC"
      />
    </TwakeMuiThemeProvider>
  )
  return onConfirm
}

describe('BookingConfirmDialog', () => {
  beforeEach(() => localStorage.clear())

  it('keeps its placeholders-only look with the high contrast mode off', () => {
    renderDialog()
    expect(screen.queryByText('a11y.requiredLegend')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('booking.form.name')).toBeInTheDocument()
  })

  describe('in high contrast mode', () => {
    beforeEach(() => act(() => setHighContrastEnabled(true)))

    it('shows labels and explains the required marker', () => {
      renderDialog()
      expect(screen.getByText('a11y.requiredLegend')).toBeInTheDocument()
      expect(
        screen.getByRole('textbox', { name: 'booking.form.name' })
      ).toBeRequired()
      expect(screen.queryByPlaceholderText('booking.form.name')).toBeNull()
    })

    it('submits with Enter, like any form', async () => {
      const onConfirm = renderDialog()
      fireEvent.change(
        screen.getByRole('textbox', { name: 'booking.form.name' }),
        { target: { value: 'Jane' } }
      )
      const email = screen.getByRole('textbox', { name: 'booking.form.email' })
      fireEvent.change(email, { target: { value: 'jane@example.org' } })
      fireEvent.submit(email.closest('form') as HTMLFormElement)

      await waitFor(() =>
        expect(onConfirm).toHaveBeenCalledWith('Jane', 'jane@example.org')
      )
    })

    it('does not flag the e-mail while it is being typed', () => {
      renderDialog()
      const email = screen.getByRole('textbox', { name: 'booking.form.email' })
      fireEvent.change(email, { target: { value: 'jane@' } })
      expect(email).toHaveAttribute('aria-invalid', 'false')

      fireEvent.blur(email)
      expect(email).toHaveAttribute('aria-invalid', 'true')
    })
  })
})
