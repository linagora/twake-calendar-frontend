import { BookingConfirmDialog } from '@public/features/booking/components/BookingDialog'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@public/components/Booking/BookingHeader/BookingOwnerInfo', () => ({
  BookingOwnerDisplay: () => null
}))

const renderDialog = (onConfirm = vi.fn()): void => {
  renderWithProviders(
    <BookingConfirmDialog
      open
      onClose={vi.fn()}
      selectedSlot={null}
      bookingInfo={null}
      onConfirm={onConfirm}
      selectedTimezone="UTC"
    />
  )
}

describe('BookingConfirmDialog visitor form (#1792)', () => {
  it('labels the required fields for good, with autocomplete', () => {
    renderDialog()

    const name = screen.getByRole('textbox', { name: 'booking.form.name' })
    const email = screen.getByRole('textbox', { name: 'booking.form.email' })
    expect(name).toBeRequired()
    expect(name).toHaveAttribute('autocomplete', 'name')
    expect(email).toBeRequired()
    expect(email).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByText('booking.form.requiredHint')).toBeInTheDocument()

    fireEvent.change(name, { target: { value: 'Visitor' } })
    // Still named while it holds a value: no placeholder-only label
    expect(
      screen.getByRole('textbox', { name: 'booking.form.name' })
    ).toHaveValue('Visitor')
  })

  it('moves to the first wrong field on a refused Confirm', async () => {
    renderDialog()

    fireEvent.click(
      screen.getByRole('button', { name: 'booking.confirm.button' })
    )

    const name = screen.getByRole('textbox', { name: 'booking.form.name' })
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveAccessibleDescription('booking.error.nameRequired')

    fireEvent.change(name, { target: { value: 'Visitor' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'booking.confirm.button' })
    )

    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'booking.form.email' })
      ).toHaveFocus()
    )
  })
})
