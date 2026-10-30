import { act, fireEvent, render, screen } from '@testing-library/react'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'

describe('SnackbarAlert during calendar interactions', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('does not dismiss when a calendar interaction clicks away', () => {
    const setOpen = vi.fn()
    render(<SnackbarAlert open setOpen={setOpen} message="Event saved" />)
    // ClickAwayListener arms on the next tick after mounting.
    act(() => {
      vi.advanceTimersByTime(1)
    })
    fireEvent.click(document.body)
    expect(setOpen).not.toHaveBeenCalled()
    expect(screen.getByText('Event saved')).toBeInTheDocument()
  })

  it('still dismisses when the configured duration elapses', () => {
    const setOpen = vi.fn()
    render(
      <SnackbarAlert
        open
        setOpen={setOpen}
        message="Event saved"
        autoHideDuration={4000}
      />
    )
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(setOpen).toHaveBeenCalledWith(false)
  })

  it('still dismisses with the close button', () => {
    const setOpen = vi.fn()
    render(<SnackbarAlert open setOpen={setOpen} message="Event saved" />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(setOpen).toHaveBeenCalledWith(false)
  })
})
