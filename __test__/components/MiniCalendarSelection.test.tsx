import { MiniCalendar } from '@common/components/Calendar/MiniCalendar'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

describe('MiniCalendar selected day', () => {
  const calendarRef = { current: null }
  const render = (selectedDate: Date) => (
    <MiniCalendar
      calendarRef={calendarRef}
      selectedDate={selectedDate}
      setSelectedMiniDate={vi.fn()}
    />
  )
  const dayTile = (year: number, month: number, date: number): HTMLElement =>
    screen.getAllByTestId(`date-${year}-${month}-${date}`)[0]

  it('selects the day the grid shows when it moves to another month', () => {
    const { rerender } = renderWithProviders(render(new Date(2026, 9, 21)))

    rerender(render(new Date(2026, 10, 2)))

    expect(dayTile(2026, 10, 2)).toHaveAttribute('aria-selected', 'true')
    expect(dayTile(2026, 10, 1)).toHaveAttribute('aria-selected', 'false')
  })

  it('selects the day the grid shows when it comes back to the previous month', () => {
    const { rerender } = renderWithProviders(render(new Date(2026, 9, 21)))
    rerender(render(new Date(2026, 10, 2)))

    rerender(render(new Date(2026, 9, 21)))

    expect(dayTile(2026, 9, 21)).toHaveAttribute('aria-selected', 'true')
    expect(dayTile(2026, 9, 1)).toHaveAttribute('aria-selected', 'false')
  })

  it('keeps the selected day while the header browses the months', async () => {
    renderWithProviders(render(new Date(2026, 9, 21)))

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(await screen.findByText(/November 2026/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(await screen.findByText(/October 2026/i)).toBeInTheDocument()

    expect(dayTile(2026, 9, 21)).toHaveAttribute('aria-selected', 'true')
  })
})
