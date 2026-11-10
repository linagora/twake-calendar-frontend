import { ResponsiveDialog } from '@common/components/Dialog'
import {
  FILE_DROP_START_AFTER,
  useDialogFileDrop
} from '@common/components/Dialog/DialogFileDrop'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })
const dataTransfer = { types: ['Files'], files: [file] }

const TakesFiles: React.FC<{ onFilesDropped: (files: File[]) => void }> = ({
  onFilesDropped
}) => {
  useDialogFileDrop(onFilesDropped, 'Drop here')
  return <p>Form</p>
}

const renderDialog = (children: React.ReactNode, open = true) =>
  render(
    <TwakeMuiThemeProvider>
      <ResponsiveDialog open={open} onClose={vi.fn()} title="Dialog">
        {children}
      </ResponsiveDialog>
    </TwakeMuiThemeProvider>
  )

const modalBody = (): HTMLElement =>
  document.querySelector<HTMLElement>('.MuiDialogContent-root')!

describe('Dialog file drop', () => {
  it('leaves a dialog where nothing takes files alone', () => {
    renderDialog(<p>Form</p>)

    fireEvent.dragEnter(document.body, { dataTransfer })
    const notCancelled = fireEvent.drop(modalBody(), { dataTransfer })

    expect(
      screen.queryByTestId('dialog-file-drop-overlay')
    ).not.toBeInTheDocument()
    // The browser keeps its own handling of the drop
    expect(notCancelled).toBe(true)
  })

  it('shows the label of the taker', () => {
    renderDialog(<TakesFiles onFilesDropped={vi.fn()} />)

    fireEvent.dragEnter(modalBody(), { dataTransfer })

    expect(screen.getByTestId('dialog-file-drop-overlay')).toHaveTextContent(
      'Drop here'
    )
  })

  describe('where the zone is', () => {
    const rect = (top: number, bottom: number, left = 0, width = 0) =>
      ({ top, bottom, left, width, right: left + width }) as DOMRect

    afterEach(() => {
      vi.restoreAllMocks()
    })

    // Dialog at (100, 100), body from 150 to 600, fields from 150 to 500,
    // 506px wide with a 32px margin, title from 150 to 200, next field at 216
    const layOut = (): void => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: Element) {
          if (this.classList.contains('MuiDialog-paper'))
            return rect(100, 700, 100)
          if (this.classList.contains('MuiDialogContent-root'))
            return rect(150, 600)
          if (this.parentElement?.classList.contains('MuiDialogContent-root'))
            return rect(150, 500, 132, 506)
          if (this.hasAttribute('data-file-drop-start-after'))
            return rect(150, 200)
          if (
            this.previousElementSibling?.hasAttribute(
              'data-file-drop-start-after'
            )
          )
            return rect(216, 260)
          return rect(0, 0)
        }
      )
    }

    it('starts under what is marked to stay above it', () => {
      layOut()
      renderDialog(
        <>
          <div {...FILE_DROP_START_AFTER}>Title</div>
          <TakesFiles onFilesDropped={vi.fn()} />
        </>
      )

      fireEvent.dragEnter(modalBody(), { dataTransfer })

      expect(screen.getByTestId('dialog-file-drop-overlay')).toHaveStyle({
        top: '116px',
        left: '32px',
        width: '506px',
        height: '284px'
      })
    })

    it('covers all the fields when nothing is marked', () => {
      layOut()
      renderDialog(<TakesFiles onFilesDropped={vi.fn()} />)

      fireEvent.dragEnter(modalBody(), { dataTransfer })

      expect(screen.getByTestId('dialog-file-drop-overlay')).toHaveStyle({
        top: '50px',
        height: '350px'
      })
    })
  })

  it('hands the dropped files to the taker', () => {
    const onFilesDropped = vi.fn()
    renderDialog(<TakesFiles onFilesDropped={onFilesDropped} />)

    fireEvent.dragEnter(modalBody(), { dataTransfer })
    fireEvent.drop(screen.getByText('Form'), { dataTransfer })

    expect(onFilesDropped).toHaveBeenCalledWith([file])
  })

  it('stops taking files once the taker is gone', () => {
    const onFilesDropped = vi.fn()
    const { rerender } = renderDialog(
      <TakesFiles onFilesDropped={onFilesDropped} />
    )
    rerender(
      <TwakeMuiThemeProvider>
        <ResponsiveDialog open onClose={vi.fn()} title="Dialog">
          <p>Other</p>
        </ResponsiveDialog>
      </TwakeMuiThemeProvider>
    )

    fireEvent.dragEnter(modalBody(), { dataTransfer })
    fireEvent.drop(modalBody(), { dataTransfer })

    expect(onFilesDropped).not.toHaveBeenCalled()
    expect(
      screen.queryByTestId('dialog-file-drop-overlay')
    ).not.toBeInTheDocument()
  })
})
