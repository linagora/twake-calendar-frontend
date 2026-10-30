import type { MockedFunction } from 'vitest'
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TdriveButton } from '@common/features/Tdrive/components/TdriveButton'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { setupStore } from '@common/app/store'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@common/features/Tdrive/components/TdrivePickerDialog', () => ({
  TdrivePickerDialog: ({ open }: { open: boolean }) =>
    React.createElement(
      'div',
      { 'data-testid': 'tdrive-dialog', 'data-open': open },
      'Dialog'
    )
}))

const mockOpenPicker = vi.fn()
const mockClosePicker = vi.fn()
const mockDismissOpenPickerError = vi.fn()
const mockOnReadyToUse = vi.fn()

const defaultHookReturn = {
  isOpen: false,
  containerRef: { current: null },
  openPickerError: null,
  openPicker: mockOpenPicker,
  closePicker: mockClosePicker,
  dismissOpenPickerError: mockDismissOpenPickerError,
  onReadyToUse: mockOnReadyToUse
}

vi.mock('@common/features/Tdrive/hooks/useTdrivePicker', async () => ({
  ...(await vi.importActual('@common/features/Tdrive/hooks/useTdrivePicker')),
  useTdrivePicker: vi.fn()
}))

import { useTdrivePicker } from '@common/features/Tdrive/hooks/useTdrivePicker'
const mockUseTdrivePicker = useTdrivePicker as MockedFunction<
  typeof useTdrivePicker
>

describe('TdriveButton', () => {
  const mockOnFilesSelected = vi.fn()
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store: setupStore() },
      React.createElement(TwakeMuiThemeProvider, null, children)
    )

  beforeEach(() => {
    vi.clearAllMocks()
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

  describe('error snackbar', () => {
    const renderWithError = () => {
      mockUseTdrivePicker.mockReturnValue({
        ...defaultHookReturn,
        openPickerError: 'tdrivePickerFailed'
      })
      render(
        React.createElement(TdriveButton, {
          onFilesSelected: mockOnFilesSelected,
          showMore: true
        }),
        { wrapper: Wrapper }
      )
    }

    afterEach(() => {
      vi.useRealTimers()
    })

    it('dismisses the error when its close button is clicked', async () => {
      renderWithError()
      await userEvent.click(screen.getByRole('button', { name: /close/i }))
      expect(mockDismissOpenPickerError).toHaveBeenCalledTimes(1)
      expect(mockClosePicker).not.toHaveBeenCalled()
    })

    it('dismisses the error after its auto hide duration', () => {
      vi.useFakeTimers()
      renderWithError()
      act(() => {
        vi.advanceTimersByTime(4000)
      })
      expect(mockDismissOpenPickerError).toHaveBeenCalledTimes(1)
      expect(mockClosePicker).not.toHaveBeenCalled()
    })

    it('reopens the picker without closing it on a click away from the error', async () => {
      renderWithError()
      // The Snackbar listens to click away only once mounted
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      fireEvent.click(
        screen.getByRole('button', { name: 'event.form.addTdriveFile' })
      )
      expect(mockOpenPicker).toHaveBeenCalledTimes(1)
      expect(mockClosePicker).not.toHaveBeenCalled()
      expect(mockDismissOpenPickerError).not.toHaveBeenCalled()
    })
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
