import React from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within
} from '@testing-library/react'
import { ThemeProvider } from '@common/ds/ThemeProvider/ThemeProvider'
import { MobileTimeSlotSelectField } from '@private/features/booking/components/TimeSlotSelectField/MobileTimeSlotSelectField'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('MobileTimeSlotSelectField', () => {
  const renderField = (setDuration = jest.fn()) =>
    render(
      <ThemeProvider>
        <MobileTimeSlotSelectField duration={30} setDuration={setDuration} />
      </ThemeProvider>
    )

  it('closes the bottom sheet once a duration is picked', async () => {
    const setDuration = jest.fn()
    renderField(setDuration)

    fireEvent.click(screen.getByRole('button', { name: 'booking.30minutes' }))
    const sheet = await screen.findByRole('presentation')
    fireEvent.click(
      within(sheet).getByRole('button', { name: 'booking.45minutes' })
    )

    expect(setDuration).toHaveBeenCalledWith(45)
    await waitFor(() =>
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument()
    )
  })

  it('closes the bottom sheet when the selected duration is tapped again', async () => {
    renderField()

    fireEvent.click(screen.getByRole('button', { name: 'booking.30minutes' }))
    const sheet = await screen.findByRole('presentation')
    fireEvent.click(
      within(sheet).getByRole('button', { name: 'booking.30minutes' })
    )

    await waitFor(() =>
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument()
    )
  })
})
