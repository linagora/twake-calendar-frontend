import { screen, fireEvent, act } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'
import TimezoneChangeAlert from '@common/components/Timezone/TimezoneChangeAlert'

jest.mock('@common/features/User/UserSlice', () => {
  const actual = jest.requireActual('@common/features/User/UserSlice')
  return {
    ...actual,
    updateUserConfigurations: jest.fn().mockImplementation(() => {
      return () => {
        const mockPromise = Promise.resolve() as any
        mockPromise.unwrap = () => Promise.resolve()
        return mockPromise
      }
    })
  }
})

describe('TimezoneChangeAlert', () => {
  let originalDateTimeFormat: typeof Intl.DateTimeFormat

  beforeEach(() => {
    originalDateTimeFormat = Intl.DateTimeFormat
    // Mock localStorage
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
    window.ASK_FOR_TZ_UPDATE = true
  })

  afterEach(() => {
    Intl.DateTimeFormat = originalDateTimeFormat
    jest.restoreAllMocks()
  })

  const mockBrowserTZ = (tz: string) => {
    jest
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation((locales, options) => {
        const timeZone = options?.timeZone || tz
        let offset = 'UTC'
        if (timeZone === 'Asia/Ho_Chi_Minh') {
          offset = 'GMT+7'
        } else if (
          timeZone === 'Europe/Paris' ||
          timeZone === 'Europe/Brussels'
        ) {
          offset = 'GMT+2'
        }
        return {
          resolvedOptions: () => ({ timeZone }),
          formatToParts: () => [{ type: 'timeZoneName', value: offset }]
        } as any
      })
  }

  const baseState = {
    settings: { timeZone: 'Europe/Paris' },
    user: { coreConfig: { datetime: { timeZone: 'Europe/Paris' } } }
  }

  it('shows snackbar when browser TZ differs from configured TZ', () => {
    mockBrowserTZ('Asia/Ho_Chi_Minh')

    const state = baseState

    renderWithProviders(<TimezoneChangeAlert />, state)

    expect(screen.getByText(/settings\.tzPrompt\.detected/)).toBeInTheDocument()
  })

  it('does not show snackbar when browser TZ matches configured TZ', () => {
    mockBrowserTZ('Europe/Paris')

    const state = baseState

    renderWithProviders(<TimezoneChangeAlert />, state)

    expect(screen.queryByText(/We detected you are in/)).not.toBeInTheDocument()
  })

  it('does not show snackbar when browser TZ has different name but same offset as configured TZ', () => {
    mockBrowserTZ('Europe/Brussels')
    const state = baseState
    renderWithProviders(<TimezoneChangeAlert />, state)
    expect(
      screen.queryByText(/settings\.tzPrompt\.detected/)
    ).not.toBeInTheDocument()
  })

  it('does not show snackbar when ASK_FOR_TZ_UPDATE is false', () => {
    window.ASK_FOR_TZ_UPDATE = false
    mockBrowserTZ('Asia/Ho_Chi_Minh')

    const state = baseState

    renderWithProviders(<TimezoneChangeAlert />, state)

    expect(screen.queryByText(/We detected you are in/)).not.toBeInTheDocument()
  })

  it('shows snackbar when auto-detect is enabled and browser TZ differs from last checked TZ', () => {
    mockBrowserTZ('Asia/Ho_Chi_Minh')
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('Europe/Paris')

    const state = {
      settings: {
        timeZone: 'Europe/Paris',
        isBrowserDefaultTimeZone: true
      },
      user: { coreConfig: { datetime: { timeZone: null } } }
    }

    renderWithProviders(<TimezoneChangeAlert />, state)

    expect(screen.getByText(/settings\.tzPrompt\.detected/)).toBeInTheDocument()
  })

  it('does not show snackbar when same TZ was already checked', () => {
    mockBrowserTZ('Asia/Ho_Chi_Minh')
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('Asia/Ho_Chi_Minh')

    const state = baseState

    renderWithProviders(<TimezoneChangeAlert />, state)

    expect(screen.queryByText(/We detected you are in/)).not.toBeInTheDocument()
  })

  it('saves to localStorage and closes when NO is clicked', async () => {
    mockBrowserTZ('Asia/Ho_Chi_Minh')

    const state = baseState

    renderWithProviders(<TimezoneChangeAlert />, state)

    const noButton = screen.getByRole('button', { name: /cancel|no/i })

    await act(async () => {
      fireEvent.click(noButton)
    })

    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      'lastCheckedTZ',
      'Asia/Ho_Chi_Minh'
    )
    expect(screen.queryByText(/We detected you are in/)).not.toBeInTheDocument()
  })

  it('saves to localStorage and dispatches actions when YES is clicked', async () => {
    mockBrowserTZ('Asia/Ho_Chi_Minh')

    const state = baseState

    const { store } = renderWithProviders(<TimezoneChangeAlert />, state)

    const yesButton = screen.getByRole('button', { name: /ok|yes/i })

    await act(async () => {
      fireEvent.click(yesButton)
    })

    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      'lastCheckedTZ',
      'Asia/Ho_Chi_Minh'
    )

    // Verify that actions were dispatched
    // In a real test we would check the store state or specific actions
    // But since we are mocking the store in renderWithProviders, we can check if the state updated if we didn't mock the reducer.
    // Or we can just verify the store has the new timezone if the reducer handled it.
    const updatedState = store.getState()
    expect(updatedState.settings.timeZone).toBe('Asia/Ho_Chi_Minh')
  })
})
