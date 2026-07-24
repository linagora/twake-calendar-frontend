import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { TdrivePickerDialog } from '@common/features/Tdrive/components/TdrivePickerDialog'
import { TdriveFile } from '@common/features/Tdrive/hooks/useTdrivePicker'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('TdrivePickerDialog', () => {
  const mockOnClose = jest.fn()
  const mockOnFileSelected = jest.fn()
  const iframeUrl = 'https://drive.example.com/intents?intent=test-123'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders loader when open and iframe not ready', () => {
    render(
      <TdrivePickerDialog
        open={true}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByTitle('Tdrive file picker')).not.toBeVisible()
  })

  it('does not render when closed', () => {
    render(
      <TdrivePickerDialog
        open={false}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows iframe after receiving ready postMessage', () => {
    render(
      <TdrivePickerDialog
        open={true}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    const iframe = screen.getByTitle('Tdrive file picker')
    expect(iframe).toHaveStyle('visibility: hidden')

    // Simulate ready postMessage from iframe
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://drive.example.com',
          data: { type: 'intent-test-123:ready' }
        })
      )
    })

    expect(iframe).toHaveStyle('visibility: visible')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('sends response postMessage back to iframe on ready', () => {
    const postMessageMock = jest.fn()

    render(
      <TdrivePickerDialog
        open={true}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    // Mock iframe contentWindow
    const iframe = screen.getByTitle('Tdrive file picker') as HTMLIFrameElement
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: postMessageMock },
      writable: true
    })

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://drive.example.com',
          data: { type: 'intent-test-123:ready' }
        })
      )
    })

    expect(postMessageMock).toHaveBeenCalledWith(
      { type: 'intent-test-123:send', payload: {} },
      'https://drive.example.com'
    )
  })

  it('ignores postMessages from wrong origin', () => {
    render(
      <TdrivePickerDialog
        open={true}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://evil.com',
          data: { type: 'intent-test-123:ready' }
        })
      )
    })

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('handles file selection postMessage', () => {
    render(
      <TdrivePickerDialog
        open={true}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    const fileData = {
      type: 'intent-response',
      file: {
        id: 'file-1',
        name: 'document.pdf',
        url: 'https://drive.example.com/doc',
        action: 'sharingLink'
      }
    }

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://drive.example.com',
          data: fileData
        })
      )
    })

    const expectedFile: TdriveFile = {
      id: 'file-1',
      name: 'document.pdf',
      url: 'https://drive.example.com/doc',
      type: 'sharingLink'
    }

    expect(mockOnFileSelected).toHaveBeenCalledWith(expectedFile)
  })

  it('shows error state after timeout', () => {
    render(
      <TdrivePickerDialog
        open={true}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    act(() => {
      jest.advanceTimersByTime(31000)
    })

    expect(
      screen.getByText('event.form.tdriveLoadingError')
    ).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    render(
      <TdrivePickerDialog
        open={true}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    const closeButton = screen.getByLabelText('actions.close')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('handles string format ready message', () => {
    render(
      <TdrivePickerDialog
        open={true}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://drive.example.com',
          data: 'intent-test-123:ready'
        })
      )
    })

    const iframe = screen.getByTitle('Tdrive file picker')
    expect(iframe).toHaveStyle('visibility: visible')
  })

  it('resets state when iframeUrl changes', () => {
    const { rerender } = render(
      <TdrivePickerDialog
        open={true}
        iframeUrl={iframeUrl}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    // Make ready
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://drive.example.com',
          data: { type: 'intent-test-123:ready' }
        })
      )
    })

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

    // Change URL
    rerender(
      <TdrivePickerDialog
        open={true}
        iframeUrl="https://drive.example.com/intents?intent=new-456"
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
      />
    )

    // Should show loader again for new iframe
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
