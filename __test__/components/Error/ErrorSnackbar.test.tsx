import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

describe('ErrorSnackbar', () => {
  it('shows the error message', () => {
    renderWithProviders(
      <ErrorSnackbar error="Something broke" type="calendar" />
    )

    expect(screen.getByText('Something broke')).toBeInTheDocument()
  })

  it('keeps the last message while it closes once the error is cleared', () => {
    const { rerender } = renderWithProviders(
      <ErrorSnackbar error="Something broke" type="calendar" />
    )

    rerender(<ErrorSnackbar error={null} type="calendar" />)

    expect(screen.queryByText('error.unknown')).not.toBeInTheDocument()
    expect(screen.getByText('Something broke')).toBeInTheDocument()
  })

  it('shows the newest error when another one replaces it', () => {
    const { rerender } = renderWithProviders(
      <ErrorSnackbar error="First failure" type="user" />
    )

    rerender(<ErrorSnackbar error="Second failure" type="user" />)

    expect(screen.getByText('Second failure')).toBeInTheDocument()
    expect(screen.queryByText('First failure')).not.toBeInTheDocument()
  })

  it('stays until it is dismissed', () => {
    vi.useFakeTimers()
    try {
      const { store } = renderWithProviders(
        <ErrorSnackbar error="Something broke" type="user" />,
        {
          user: {
            userData: null,
            tokens: null,
            loading: false,
            error: 'Something broke',
            coreConfig: { language: 'en' }
          }
        }
      )

      act(() => {
        vi.advanceTimersByTime(10000)
      })

      expect(store.getState().user.error).toBe('Something broke')
    } finally {
      vi.useRealTimers()
    }
  })
})
