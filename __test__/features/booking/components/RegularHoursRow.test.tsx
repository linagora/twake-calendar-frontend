import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { RegularHoursRow } from '../../../../apps/private/src/features/booking/components/RegularHoursField/RegularHoursRow'
import { TimePickerField } from '../../../../common/src/components/Event/components/DateTimeFields/TimePickerField'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string, options: any) => options?.defaultValue || key
  })
}))

jest.mock(
  '../../../../common/src/components/Event/components/DateTimeFields/TimePickerField',
  () => ({
    TimePickerField: jest.fn(({ value, onChange, testId, disabled }) => (
      <input
        data-testid={testId || 'mock-time-picker'}
        value={value ? value.format('HH:mm') : ''}
        disabled={disabled}
        onChange={e => {
          // just a mock to trigger onChange
          onChange({
            isValid: () => true,
            format: () => e.target.value
          })
        }}
      />
    ))
  })
)

const customRender = (ui: React.ReactElement, options?: any) =>
  render(ui, {
    wrapper: ({ children }) => (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {children}
      </LocalizationProvider>
    ),
    ...options
  })

describe('RegularHoursRow', () => {
  const mockHandleToggleDay = jest.fn()
  const mockHandleTimeChange = jest.fn()
  const mockHandleAddSlot = jest.fn()
  const mockHandleRemoveSlot = jest.fn()
  const mockHandleCopySlot = jest.fn()

  const defaultProps = {
    day: 'MON' as any,
    dayLabel: 'Mon',
    isWorkingDay: true,
    isEnabled: true,
    slots: [{ start: '09:00', end: '12:00' }],
    handleToggleDay: mockHandleToggleDay,
    handleTimeChange: mockHandleTimeChange,
    handleAddSlot: mockHandleAddSlot,
    handleRemoveSlot: mockHandleRemoveSlot,
    handleCopySlot: mockHandleCopySlot
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    customRender(<RegularHoursRow {...defaultProps} />)
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12:00')).toBeInTheDocument()
  })

  it('shows disabled slots when not enabled', () => {
    customRender(<RegularHoursRow {...defaultProps} isEnabled={false} />)
    const startInput = screen.getByDisplayValue('09:00')
    expect(startInput).toBeDisabled()
    expect(TimePickerField).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: true }),
      expect.anything()
    )
  })

  it('calls handleToggleDay on switch click', () => {
    customRender(<RegularHoursRow {...defaultProps} />)
    const switchEl = screen.getByRole('switch')
    fireEvent.click(switchEl)
    expect(mockHandleToggleDay).toHaveBeenCalledWith('MON')
  })

  it('calls handleTimeChange on input change', () => {
    customRender(<RegularHoursRow {...defaultProps} />)
    const startInput = screen.getByDisplayValue('09:00')
    fireEvent.change(startInput, { target: { value: '10:00' } })
    expect(mockHandleTimeChange).toHaveBeenCalledWith(
      'MON',
      0,
      'start',
      '10:00'
    )
  })

  it('calls handleAddSlot on plus click', () => {
    customRender(<RegularHoursRow {...defaultProps} />)
    const addBtn = screen.getByTestId('AddIcon').closest('button')
    if (!addBtn) throw new Error('Add button not found')
    fireEvent.click(addBtn)
    expect(mockHandleAddSlot).toHaveBeenCalledWith('MON')
  })

  it('calls handleRemoveSlot on delete click', () => {
    const multiSlotProps = {
      ...defaultProps,
      slots: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '18:00' }
      ]
    }
    customRender(<RegularHoursRow {...multiSlotProps} />)
    const deleteBtn = screen.getByTestId('DeleteOutlinedIcon').closest('button')
    if (!deleteBtn) throw new Error('Delete button not found')
    fireEvent.click(deleteBtn)
    expect(mockHandleRemoveSlot).toHaveBeenCalledWith('MON', 1)
  })

  it('calls handleCopySlot on copy click', () => {
    customRender(<RegularHoursRow {...defaultProps} />)
    const copyBtn = screen.getByTestId('ContentCopyIcon').closest('button')
    if (!copyBtn) throw new Error('Copy button not found')
    fireEvent.click(copyBtn)
    expect(mockHandleCopySlot).toHaveBeenCalledWith('MON', 0)
  })

  it('reports an error when the end time is before the start time', () => {
    customRender(
      <RegularHoursRow
        {...defaultProps}
        slots={[{ start: '09:00', end: '08:00' }]}
      />
    )
    expect(screen.getByTestId('slot-error-MON-0')).toHaveTextContent(
      'event.validation.endAfterStart'
    )
    expect(TimePickerField).toHaveBeenCalledWith(
      expect.objectContaining({ hasError: true }),
      expect.anything()
    )
  })

  it('associates the slot error with both time inputs', () => {
    customRender(
      <RegularHoursRow
        {...defaultProps}
        slots={[{ start: '09:00', end: '08:00' }]}
      />
    )
    expect(screen.getByTestId('slot-error-MON-0')).toHaveAttribute(
      'id',
      'slot-error-MON-0'
    )
    ;['start-time-MON-0', 'end-time-MON-0'].forEach(testId =>
      expect(TimePickerField).toHaveBeenCalledWith(
        expect.objectContaining({ testId, errorId: 'slot-error-MON-0' }),
        expect.anything()
      )
    )
  })

  it('does not report an error for a valid slot', () => {
    customRender(<RegularHoursRow {...defaultProps} />)
    expect(screen.queryByTestId('slot-error-MON-0')).not.toBeInTheDocument()
  })

  it('does not report an error for a disabled day', () => {
    customRender(
      <RegularHoursRow
        {...defaultProps}
        isEnabled={false}
        slots={[{ start: '09:00', end: '08:00' }]}
      />
    )
    expect(screen.queryByTestId('slot-error-MON-0')).not.toBeInTheDocument()
  })
})
