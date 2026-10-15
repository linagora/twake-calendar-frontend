import { ColorSchemeSync } from '@common/features/Settings/ColorSchemeSync'
import '@testing-library/jest-dom'
import { waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

function renderWithTheme(theme: 'light' | 'dark'): void {
  renderWithProviders(<ColorSchemeSync />, {
    user: {
      coreConfig: { language: 'en', datetime: { timeZone: 'UTC' }, theme }
    }
  })
}

describe('ColorSchemeSync', () => {
  it('applies the theme of the user setting', async () => {
    renderWithTheme('dark')

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    })
  })

  it('goes back to the light scheme when the setting says so', async () => {
    renderWithTheme('light')

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    })
  })
})
