import type { Mock } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { RegularHoursField } from '../../../../apps/private/src/features/booking/components/RegularHoursField'
import { useRegularHours } from '../../../../apps/private/src/features/booking/hooks/useRegularHours'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string, options: any) => options?.defaultValue || key
  })
}))

vi.mock(
  '../../../../apps/private/src/features/booking/hooks/useRegularHours',
  async () => ({
    ...(await vi.importActual(
      '../../../../apps/private/src/features/booking/hooks/useRegularHours'
    )),
    useRegularHours: vi.fn()
  })
)

vi.mock(
  '../../../../apps/private/src/features/booking/components/RegularHoursField/RegularHoursRow',
  () => ({
    RegularHoursRow: ({ day, isWorkingDay, isEnabled, dayLabel }: any) => (
      <div
        data-testid={`row-${day}`}
        data-working-day={isWorkingDay}
        data-enabled={isEnabled}
      >
        {dayLabel}
      </div>
    )
  })
)

describe('RegularHoursField', () => {
  const mockSetAvailabilityRules = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRegularHours as Mock).mockReturnValue({
      handleToggleDay: vi.fn(),
      handleAddSlot: vi.fn(),
      handleRemoveSlot: vi.fn(),
      handleTimeChange: vi.fn(),
      handleCopySlot: vi.fn(),
      getDayLabel: (day: string) => `Label-${day}`
    })
  })

  it('renders correctly with default slots', () => {
    render(
      <RegularHoursField
        availabilityRules={[]}
        setAvailabilityRules={mockSetAvailabilityRules}
        workingDays={[1, 2, 3, 4, 5]}
      />
    )

    expect(screen.getByText('booking.setRegularHours')).toBeInTheDocument()

    // Check if it renders 7 rows
    const rows = screen.getAllByTestId(/^row-/)
    expect(rows).toHaveLength(7)
  })

  it('passes correct props to RegularHoursRow', () => {
    // 1=MON, 2=TUE... in DAY_TO_FC
    const availabilityRules = [
      {
        dayOfWeek: 'MON' as any,
        enabled: true,
        slots: [{ start: '10:00', end: '11:00' }]
      }
    ]

    render(
      <RegularHoursField
        availabilityRules={availabilityRules}
        setAvailabilityRules={mockSetAvailabilityRules}
        workingDays={[1]} // Only Monday is a working day
      />
    )

    const monRow = screen.getByTestId('row-MON')
    expect(monRow).toHaveAttribute('data-working-day', 'true')
    expect(monRow).toHaveAttribute('data-enabled', 'true')
    expect(monRow).toHaveTextContent('Label-MON')

    const tueRow = screen.getByTestId('row-TUE')
    // Tue should be non-working since only 1 is in workingDays
    expect(tueRow).toHaveAttribute('data-working-day', 'false')
    expect(tueRow).toHaveAttribute('data-enabled', 'false')
    expect(tueRow).toHaveTextContent('Label-TUE')
  })
})
