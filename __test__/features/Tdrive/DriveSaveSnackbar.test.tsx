import type { MockedFunction } from 'vitest'
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { DriveSaveSnackbar } from '@common/features/Tdrive/components/DriveSaveSnackbar'
import { useTdriveMove } from '@common/features/Tdrive/hooks/useTdriveMove'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      vars ? `${key} ${Object.values(vars).join(' ')}` : key
  })
}))

vi.mock('@common/features/Tdrive/components/TdrivePickerDialog', () => ({
  TdrivePickerDialog: ({
    open,
    dismissibleWhenReady
  }: {
    open: boolean
    dismissibleWhenReady?: boolean
  }) =>
    React.createElement('div', {
      'data-testid': 'tdrive-dialog',
      'data-open': open,
      'data-dismissible': String(dismissibleWhenReady)
    })
}))

vi.mock('@common/features/Tdrive/hooks/useTdriveMove', () => ({
  useTdriveMove: vi.fn()
}))

const mockUseTdriveMove = useTdriveMove as MockedFunction<typeof useTdriveMove>
const mockOpenMove = vi.fn()

const hookReturn = (
  overrides: Partial<ReturnType<typeof useTdriveMove>> = {}
): ReturnType<typeof useTdriveMove> => ({
  isOpen: false,
  containerRef: { current: null },
  openMoveError: null,
  openMove: mockOpenMove,
  closeMove: vi.fn(),
  dismissOpenMoveError: vi.fn(),
  onReadyToUse: vi.fn(),
  ...overrides
})

const savedFile = { id: 'file-1', name: 'agenda.pdf', dirId: 'calendar-dir' }

const renderSnackbar = (
  file: typeof savedFile | null = savedFile,
  onClose = vi.fn()
): ReturnType<typeof render> =>
  render(
    <TwakeMuiThemeProvider>
      <DriveSaveSnackbar file={file} onClose={onClose} />
    </TwakeMuiThemeProvider>
  )

describe('DriveSaveSnackbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTdriveMove.mockReturnValue(hookReturn())
  })

  it('shows nothing without a saved file', () => {
    renderSnackbar(null)
    expect(screen.queryByText(/tdrive.savedToDrive/)).not.toBeInTheDocument()
  })

  it('tells the file got saved, with an Organise button', () => {
    renderSnackbar()
    expect(
      screen.getByText('tdrive.savedToDrive agenda.pdf')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'tdrive.organise' })
    ).toBeInTheDocument()
  })

  it('opens the MOVE intent on the saved file', async () => {
    renderSnackbar()
    await userEvent.click(
      screen.getByRole('button', { name: 'tdrive.organise' })
    )
    expect(mockOpenMove).toHaveBeenCalledWith(savedFile)
  })

  it('keeps the MOVE dialog open under Escape once it is ready', () => {
    mockUseTdriveMove.mockReturnValue(hookReturn({ isOpen: true }))
    renderSnackbar()
    expect(screen.getByTestId('tdrive-dialog')).toHaveAttribute(
      'data-dismissible',
      'false'
    )
    expect(screen.queryByText(/tdrive.savedToDrive/)).not.toBeInTheDocument()
  })

  it('tells where the file got moved, without the button', () => {
    renderSnackbar()
    const { onMoved } = mockUseTdriveMove.mock.calls[0][0]
    act(() => {
      onMoved([
        { id: 'file-1', name: 'agenda.pdf', path: '/Projects/agenda.pdf' }
      ])
    })
    expect(
      screen.getByText('tdrive.movedTo /Projects/agenda.pdf')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'tdrive.organise' })
    ).not.toBeInTheDocument()
  })

  it('shows an error when the MOVE intent fails to open', () => {
    mockUseTdriveMove.mockReturnValue(
      hookReturn({ openMoveError: 'tdriveMoveFailed' })
    )
    renderSnackbar()
    expect(screen.getByText('tdrive.organiseError')).toBeInTheDocument()
  })
})
