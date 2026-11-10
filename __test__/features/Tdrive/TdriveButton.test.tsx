import type { MockedFunction } from 'vitest'
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HTTPError } from 'ky'
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

vi.mock('@common/features/Tdrive/AttachmentDao', async () => ({
  ...(await vi.importActual('@common/features/Tdrive/AttachmentDao')),
  uploadAttachment: vi.fn()
}))

import { useTdrivePicker } from '@common/features/Tdrive/hooks/useTdrivePicker'
import { uploadAttachment } from '@common/features/Tdrive/AttachmentDao'
import { Attachment } from '@common/types/Attachment'
import { ResponsiveDialog } from '@common/components/Dialog'
const mockUploadAttachment = vi.mocked(uploadAttachment)
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
    expect(
      screen.getByRole('button', { name: 'event.form.addTdriveFile' })
    ).toBeInTheDocument()
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
    await userEvent.click(
      screen.getByRole('button', { name: 'event.form.addTdriveFile' })
    )
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

  describe('uploading files', () => {
    const driveAttachment = new Attachment(
      'https://drive.example.com/public?sharecode=abc',
      'application/pdf',
      'report.pdf'
    )
    const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })

    // The modal body is the drop zone: the button sits in one, as in the
    // event modals
    const renderButton = (showMore: boolean) => {
      const setAttachments = vi.fn()
      render(
        <ResponsiveDialog open onClose={vi.fn()} title="event">
          <TdriveButton
            onFilesSelected={mockOnFilesSelected}
            showMore={showMore}
            attachments={[]}
            setAttachments={setAttachments}
          />
        </ResponsiveDialog>,
        { wrapper: Wrapper }
      )
      return setAttachments
    }

    const modalBody = (): HTMLElement => {
      const body = document.querySelector<HTMLElement>('.MuiDialogContent-root')
      if (!body) throw new Error('The dialog has no body')
      return body
    }

    const dndAttachment = () => {
      const setAttachments = renderButton(false)
      const dataTransfer = { types: ['Files'], files: [file] }

      fireEvent.dragEnter(modalBody(), { dataTransfer })
      expect(screen.getByText('event.form.dropAttachments')).toBeInTheDocument()
      fireEvent.drop(modalBody(), { dataTransfer })

      expect(
        screen.queryByText('event.form.dropAttachments')
      ).not.toBeInTheDocument()
      expect(mockUploadAttachment).toHaveBeenCalledWith(file)

      return setAttachments
    }

    it('shows a loader chip while the file uploads', async () => {
      mockUploadAttachment.mockResolvedValue(driveAttachment)

      dndAttachment()
      expect(
        screen.getByRole('progressbar')
      ).toBeInTheDocument()
    })

    it('uploads the files dropped anywhere on the modal body', async () => {
      mockUploadAttachment.mockResolvedValue(driveAttachment)

      const setAttachments = dndAttachment()
      await vi.waitFor(() =>
        expect(setAttachments).toHaveBeenCalledWith([driveAttachment])
      )
    })

    it('ignores text dragged over the modal body', () => {
      renderButton(true)
      const dataTransfer = { types: ['text/plain'], files: [] }

      fireEvent.dragEnter(modalBody(), { dataTransfer })
      fireEvent.drop(modalBody(), { dataTransfer })

      expect(
        screen.queryByText('event.form.dropAttachments')
      ).not.toBeInTheDocument()
      expect(mockUploadAttachment).not.toHaveBeenCalled()
    })

    it('shows the zone as soon as files are dragged over the app', () => {
      renderButton(true)
      const dataTransfer = { types: ['Files'], files: [file] }

      fireEvent.dragEnter(document.body, { dataTransfer })

      expect(screen.getByTestId('dialog-file-drop-overlay')).toHaveTextContent(
        'event.form.dropAttachments'
      )
    })

    it('hides the zone once the files leave the app', () => {
      renderButton(true)
      const dataTransfer = { types: ['Files'], files: [file] }

      fireEvent.dragEnter(document.body, { dataTransfer })
      fireEvent.dragLeave(document.body, { dataTransfer })

      expect(
        screen.queryByTestId('dialog-file-drop-overlay')
      ).not.toBeInTheDocument()
    })

    it('ignores files dropped out of the modal body, without opening them', () => {
      renderButton(true)
      const dataTransfer = { types: ['Files'], files: [file] }

      fireEvent.dragEnter(document.body, { dataTransfer })
      const notCancelled = fireEvent.drop(document.body, { dataTransfer })

      expect(notCancelled).toBe(false)
      expect(mockUploadAttachment).not.toHaveBeenCalled()
      expect(
        screen.queryByTestId('dialog-file-drop-overlay')
      ).not.toBeInTheDocument()
    })

    const httpError = (status: number): HTTPError =>
      new HTTPError(
        new Response(null, { status }),
        new Request('https://calendar.example.com/api/attachments'),
        {} as ConstructorParameters<typeof HTTPError>[2]
      )

    it.each([
      [404, 'event.form.attachmentUploadUnavailable'],
      [400, 'event.form.attachmentRejected'],
      [413, 'event.form.attachmentTooLarge'],
      [504, 'event.form.attachmentUploadTimeout'],
      [502, 'event.form.attachmentUploadError']
    ])('tells the user about a %s', async (status, message) => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      mockUploadAttachment.mockRejectedValue(httpError(status))

      dndAttachment()

      expect(await screen.findByText(message)).toBeInTheDocument()
    })

    it('shows no upload error on a 401: the user signs in again', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      mockUploadAttachment.mockRejectedValue(httpError(401))

      dndAttachment()

      await vi.waitFor(() =>
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('tells the user when the upload failed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      mockUploadAttachment.mockRejectedValue(new TypeError('Failed to fetch'))

      dndAttachment()

      expect(
        await screen.findByText('event.form.attachmentUploadError')
      ).toBeInTheDocument()
    })
  })
})
