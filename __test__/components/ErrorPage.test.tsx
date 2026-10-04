import { Error as ErrorPage } from '@common/components/Error/Error'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

describe('Error page', () => {
  it('translates an error carrying a translation key', () => {
    renderWithProviders(<ErrorPage />, {
      user: {
        userData: null,
        tokens: null,
        loading: false,
        error: 'TRANSLATION:error.ssoUnreachable',
        coreConfig: { language: 'en' }
      }
    })

    expect(screen.getByText(/^error\.ssoUnreachable/)).toBeInTheDocument()
  })

  it('shows a plain error as is', () => {
    renderWithProviders(<ErrorPage />, {
      user: {
        userData: null,
        tokens: null,
        loading: false,
        error: 'OAuth callback failed',
        coreConfig: { language: 'en' }
      }
    })

    expect(screen.getByText('OAuth callback failed')).toBeInTheDocument()
  })
})
