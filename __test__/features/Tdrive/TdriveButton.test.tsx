import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TdriveButton } from '@common/features/Tdrive/components/TdriveButton'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { setupStore } from '@common/app/store'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

jest.mock('@common/features/Tdrive/components/TdrivePickerDialog', () => ({
  TdrivePickerDialog: ({ open }: { open: boolean }) =>
    React.createElement(
      'div',
      { 'data-testid': 'tdrive-dialog', 'data-open': open },
      'Dialog'
    )
}))

const mockOpenPicker = jest.fn()
const mockClosePicker = jest.fn()
const mockOnReadyToUse = jest.fn()

const defaultHookReturn = {
  isOpen: false,
  containerRef: { current: null },
  openPickerError: null,
  openPicker: mockOpenPicker,
  closePicker: mockClosePicker,
  onReadyToUse: mockOnReadyToUse
}

jest.mock('@common/features/Tdrive/hooks/useTdrivePicker', () => ({
  ...jest.requireActual('@common/features/Tdrive/hooks/useTdrivePicker'),
  useTdrivePicker: jest.fn()
}))

import { useTdrivePicker } from '@common/features/Tdrive/hooks/useTdrivePicker'
const mockUseTdrivePicker = useTdrivePicker as jest.MockedFunction<
  typeof useTdrivePicker
>

describe('TdriveButton', () => {
  const mockOnFilesSelected = jest.fn()
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store: setupStore() },
      React.createElement(TwakeMuiThemeProvider, null, children)
    )

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseTdrivePicker.mockReturnValue(defaultHookReturn)
  })

  it('renders short mode button when showMore is false', () => {
    render(
      React.createElement(TdriveButton, {
        onFilesSelected: mockOnFilesSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByText('event.form.addTdriveFile')).toBeInTheDocument()
  })

  it('renders expanded mode button when showMore is true', () => {
    render(
      React.createElement(TdriveButton, {
        onFilesSelected: mockOnFilesSelected,
        showMore: true
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByRole('button')).toHaveTextContent(
      'event.form.addTdriveFile'
    )
  })

  it('shows label in expanded mode', () => {
    render(
      React.createElement(TdriveButton, {
        onFilesSelected: mockOnFilesSelected,
        showMore: true
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByText('event.form.tdriveFiles')).toBeInTheDocument()
  })

  it('does not show label in short mode', () => {
    render(
      React.createElement(TdriveButton, {
        onFilesSelected: mockOnFilesSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    expect(screen.queryByText('event.form.tdriveFiles')).not.toBeInTheDocument()
  })

  it('calls openPicker when short mode button is clicked', async () => {
    render(
      React.createElement(TdriveButton, {
        onFilesSelected: mockOnFilesSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    await userEvent.click(screen.getByText('event.form.addTdriveFile'))
    expect(mockOpenPicker).toHaveBeenCalledTimes(1)
  })

  it('calls openPicker when expanded mode button is clicked', async () => {
    render(
      React.createElement(TdriveButton, {
        onFilesSelected: mockOnFilesSelected,
        showMore: true
      }),
      { wrapper: Wrapper }
    )
    await userEvent.click(screen.getByRole('button'))
    expect(mockOpenPicker).toHaveBeenCalledTimes(1)
  })

  it('forwards isOpen to TdrivePickerDialog', () => {
    mockUseTdrivePicker.mockReturnValue({
      ...defaultHookReturn,
      isOpen: true
    })
    render(
      React.createElement(TdriveButton, {
        onFilesSelected: mockOnFilesSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByTestId('tdrive-dialog')).toHaveAttribute(
      'data-open',
      'true'
    )
  })

  it('shows error snackbar when openPickerError is set', () => {
    mockUseTdrivePicker.mockReturnValue({
      ...defaultHookReturn,
      openPickerError: 'tdrivePickerFailed'
    })
    render(
      React.createElement(TdriveButton, {
        onFilesSelected: mockOnFilesSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByText('event.form.tdrivePickerError')).toBeInTheDocument()
  })

  it('renders TdrivePickerDialog', () => {
    render(
      React.createElement(TdriveButton, {
        onFilesSelected: mockOnFilesSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByTestId('tdrive-dialog')).toBeInTheDocument()
  })
})
