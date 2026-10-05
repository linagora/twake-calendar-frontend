import { MAIN_CONTENT_ID, SkipLink } from '@common/components/SkipLink'
import { setHighContrastEnabled } from '@common/features/Settings/Accessibility/highContrastMode'
import { act, fireEvent, render, screen } from '@testing-library/react'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

describe('SkipLink', () => {
  beforeEach(() => localStorage.clear())

  const renderPage = (): void => {
    render(
      <>
        <SkipLink />
        <button>Menu</button>
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>
          Calendar
        </main>
      </>
    )
  }

  it('is not there with the high contrast mode off', () => {
    renderPage()
    expect(screen.queryByText('a11y.skipToContent')).not.toBeInTheDocument()
  })

  it('moves the focus to the main content in high contrast mode', () => {
    act(() => setHighContrastEnabled(true))
    renderPage()

    fireEvent.click(screen.getByText('a11y.skipToContent'))

    expect(document.getElementById(MAIN_CONTENT_ID)).toHaveFocus()
  })
})
