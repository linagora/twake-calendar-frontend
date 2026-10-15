import SettingsPage from '@common/features/Settings/SettingsPage'
import { api } from '@common/utils/apiUtils'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

jest.mock('@common/utils/apiUtils')

function makeState(theme?: 'light' | 'dark' | 'auto' | null): object {
  return {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        family_name: 'Doe',
        name: 'John',
        sid: 'mockSid',
        openpaasId: '667037022b752d0026472254'
      },
      organiserData: null,
      tokens: null,
      coreConfig: {
        language: 'en',
        datetime: { timeZone: 'UTC' },
        ...(theme !== undefined ? { theme } : {})
      },
      alarmEmailsEnabled: false,
      loading: false,
      error: null
    },
    settings: {
      language: 'en',
      timeZone: 'UTC',
      isBrowserDefaultTimeZone: false,
      view: 'settings'
    }
  }
}

async function chooseTheme(name: RegExp): Promise<void> {
  fireEvent.mouseDown(screen.getByLabelText('settings.themeSelector'))
  fireEvent.click(await screen.findByRole('option', { name }))
}

describe('ThemeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.HIDE_THEME_SELECTOR = false
  })

  it('saves the chosen theme in the core.theme user setting', async () => {
    ;(api.patch as jest.Mock).mockResolvedValue({ status: 204 })
    const { store } = renderWithProviders(<SettingsPage />, makeState(null))

    await chooseTheme(/settings.themes.dark/)

    await waitFor(() => {
      expect(store.getState().user.coreConfig.theme).toBe('dark')
    })
    expect(api.patch).toHaveBeenCalledWith(
      'api/configurations?scope=user',
      expect.objectContaining({
        json: expect.arrayContaining([
          expect.objectContaining({
            name: 'core',
            configurations: expect.arrayContaining([
              expect.objectContaining({ name: 'theme', value: 'dark' })
            ])
          })
        ])
      })
    )
  })

  it('keeps the saved theme when the save fails', async () => {
    ;(api.patch as jest.Mock).mockRejectedValue(new Error('API Error'))
    const { store } = renderWithProviders(<SettingsPage />, makeState('light'))

    await chooseTheme(/settings.themes.dark/)

    expect(
      await screen.findByText('settings.themeUpdateError')
    ).toBeInTheDocument()
    expect(store.getState().user.coreConfig.theme).toBe('light')
  })

  it('is hidden where common settings own the theme', () => {
    window.HIDE_THEME_SELECTOR = true
    renderWithProviders(<SettingsPage />, makeState('dark'))

    expect(screen.queryByLabelText('settings.themeSelector')).toBe(null)
  })
})
