import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TdriveButton } from '@common/features/Tdrive/components/TdriveButton'
import { Provider } from 'react-redux'
import { setupStore } from '@common/app/store'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

jest.mock('@common/features/Tdrive/components/TdrivePickerDialog', () => ({
  TdrivePickerDialog: ({
    open,
    iframeUrl
  }: {
    open: boolean
    iframeUrl: string | null
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'tdrive-dialog',
        'data-open': open,
        'data-url': iframeUrl
      },
      'Dialog'
    )
}))

const mockOpenPicker = jest.fn()
const mockClosePicker = jest.fn()
const mockHandleFileSelected = jest.fn()

const defaultHookReturn = {
  isOpen: false,
  iframeUrl: null,
  openPickerError: null,
  openPicker: mockOpenPicker,
  closePicker: mockClosePicker,
  handleFileSelected: mockHandleFileSelected
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
  const mockOnFileSelected = jest.fn()
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store: setupStore() }, children)

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseTdrivePicker.mockReturnValue(defaultHookReturn)
  })

  it('renders short mode button when showMore is false', () => {
    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByText('event.form.addTdriveFile')).toBeInTheDocument()
  })

  it('renders expanded mode button when showMore is true', () => {
    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
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
        onFileSelected: mockOnFileSelected,
        showMore: true
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByText('event.form.tdriveFiles')).toBeInTheDocument()
  })

  it('does not show label in short mode', () => {
    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    expect(screen.queryByText('event.form.tdriveFiles')).not.toBeInTheDocument()
  })

  it('calls openPicker when short mode button is clicked', async () => {
    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
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
        onFileSelected: mockOnFileSelected,
        showMore: true
      }),
      { wrapper: Wrapper }
    )
    await userEvent.click(screen.getByRole('button'))
    expect(mockOpenPicker).toHaveBeenCalledTimes(1)
  })

  it('forwards isOpen and iframeUrl to TdrivePickerDialog', () => {
    mockUseTdrivePicker.mockReturnValue({
      ...defaultHookReturn,
      isOpen: true,
      iframeUrl: 'https://drive.example.com/intent'
    })
    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    const dialog = screen.getByTestId('tdrive-dialog')
    expect(dialog).toHaveAttribute('data-open', 'true')
    expect(dialog).toHaveAttribute(
      'data-url',
      'https://drive.example.com/intent'
    )
  })

  it('shows error snackbar when openPickerError is set', () => {
    mockUseTdrivePicker.mockReturnValue({
      ...defaultHookReturn,
      openPickerError: 'tdrivePickerFailed'
    })
    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByText('event.form.tdrivePickerError')).toBeInTheDocument()
  })

  it('renders TdrivePickerDialog', () => {
    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )
    expect(screen.getByTestId('tdrive-dialog')).toBeInTheDocument()
  })
})
