import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { BookingStatusSwitch } from '@private/features/booking/components/BookingStatusSwitch'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue || key
  })
}))

describe('BookingStatusSwitch', () => {
  const renderWithTheme = (ui: React.ReactElement) =>
    render(<TwakeMuiThemeProvider>{ui}</TwakeMuiThemeProvider>)

  it('renders switch with active state and handles change', async () => {
    const handleChange = jest.fn()
    renderWithTheme(
      <BookingStatusSwitch active={true} onChange={handleChange} />
    )

    const switchElement = screen.getByRole('switch', {
      name: 'booking.activeSchedule'
    })
    expect(switchElement).toBeChecked()
    fireEvent.mouseOver(switchElement)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'booking.activeSchedule'
    )

    fireEvent.click(switchElement)
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('renders switch with inactive state', async () => {
    const handleChange = jest.fn()
    renderWithTheme(
      <BookingStatusSwitch active={false} onChange={handleChange} />
    )

    const switchElement = screen.getByRole('switch', {
      name: 'booking.activeSchedule'
    })
    expect(switchElement).not.toBeChecked()
    fireEvent.mouseOver(switchElement)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'booking.inactiveSchedule'
    )
  })
})
