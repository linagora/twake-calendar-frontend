import { TitleField } from '@common/components/Event/fields/TitleField'
import { setHighContrastEnabled } from '@common/features/Settings/Accessibility/highContrastMode'
import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

describe('TitleField in the compact form', () => {
  beforeEach(() => localStorage.clear())

  const renderTitle = (): void => {
    renderWithProviders(
      <TitleField
        value=""
        onChange={jest.fn()}
        showMore={false}
        isExpanded={false}
        isOpen={false}
      />
    )
  }

  it('only has its placeholder with the high contrast mode off', () => {
    renderTitle()
    expect(screen.queryByText('event.form.title')).not.toBeInTheDocument()
  })

  it('shows its label in high contrast mode', () => {
    act(() => setHighContrastEnabled(true))
    renderTitle()
    expect(screen.getByText('event.form.title')).toBeVisible()
  })
})
