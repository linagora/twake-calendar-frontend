import EventPopover from '@common/features/Events/EventModal'
import { Attachment } from '@common/types/Attachment'
import { DateSelectInfo } from '@fullcalendar/react'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@common/features/Tdrive/components/TdrivePickerDialog', () => ({
  TdrivePickerDialog: () => null
}))

vi.mock('@common/features/Tdrive/AttachmentDao', async () => ({
  ...(await vi.importActual('@common/features/Tdrive/AttachmentDao')),
  uploadAttachment: vi.fn()
}))

import { uploadAttachment } from '@common/features/Tdrive/AttachmentDao'

const mockUploadAttachment = vi.mocked(uploadAttachment)

describe('EventPopover with attachments uploading', () => {
  const preloadedState = {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        sid: 'aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro',
        openpaasId: '667037022b752d0026472254',
        workplaceFqdn: 'test.example.com'
      },
      organiserData: { cn: 'test', cal_address: 'test@test.com' }
    },
    calendars: {
      list: {
        '667037022b752d0026472254/cal1': {
          id: '667037022b752d0026472254/cal1',
          name: 'Calendar 1',
          color: '#FF0000'
        }
      },
      pending: false
    }
  }

  const selectedRange = {
    startStr: '2025-07-18T09:00',
    endStr: '2025-07-18T10:00',
    start: new Date('2025-07-18T09:00'),
    end: new Date('2025-07-18T10:00'),
    allDay: false,
    resource: undefined
  } as unknown as DateSelectInfo

  const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })
  let finishUpload: (attachment: Attachment) => void
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    window.TDRIVE_ENABLED = true
    mockUploadAttachment.mockReturnValue(
      new Promise(resolve => {
        finishUpload = resolve
      })
    )
  })

  afterEach(() => {
    window.TDRIVE_ENABLED = undefined
  })

  const renderWithUploadRunning = (): void => {
    renderWithProviders(
      <EventPopover
        open={true}
        onClose={onClose}
        selectedRange={selectedRange}
        setSelectedRange={vi.fn()}
        calendarRef={{ current: { select: vi.fn() } } as never}
      />,
      preloadedState
    )
    const body = document.querySelector<HTMLElement>('.MuiDialogContent-root')
    if (!body) throw new Error('The dialog has no body')
    const dataTransfer = { types: ['Files'], files: [file] }
    fireEvent.dragEnter(body, { dataTransfer })
    fireEvent.drop(body, { dataTransfer })
    expect(mockUploadAttachment).toHaveBeenCalledWith(file)
  }

  const saveButton = (): HTMLElement =>
    screen.getByRole('button', { name: 'actions.save' })

  it('cannot be saved until the files are in', async () => {
    renderWithUploadRunning()

    expect(saveButton()).toBeDisabled()

    await act(async () =>
      finishUpload(
        new Attachment(
          'https://drive.example.com/public?sharecode=abc',
          'application/pdf',
          'report.pdf'
        )
      )
    )

    expect(saveButton()).toBeEnabled()
  })

  it('is not saved by the keyboard shortcut either', () => {
    renderWithUploadRunning()

    fireEvent.keyDown(
      screen.getByRole('textbox', { name: 'event.form.title' }),
      {
        key: 'Enter',
        ctrlKey: true
      }
    )

    expect(onClose).not.toHaveBeenCalled()
    expect(saveButton()).toBeInTheDocument()
  })

  it('asks before closing and losing the files on their way', () => {
    renderWithUploadRunning()

    fireEvent.click(screen.getByRole('button', { name: 'actions.close' }))

    expect(
      screen.getByText('editModeDialog.discardChanges.title')
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
