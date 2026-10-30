import type { Mock } from 'vitest'
import { useDetectedTimeZoneSync } from '@common/components/Timezone/hooks/useDetectedTimeZoneSync'
import { setIsBrowserDefaultTimeZone } from '@common/features/Settings/SettingsSlice'
import { patchConfigurations } from '@common/features/User/UserDao'
import { setTimezone as setUserTimeZone } from '@common/features/User/UserSlice'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { act, waitFor } from '@testing-library/react'
import React from 'react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@common/features/User/UserDao', async () => {
  const actual = await vi.importActual('@common/features/User/UserDao')
  return {
    ...actual,
    patchConfigurations: vi.fn()
  }
})

const Probe: React.FC = () => {
  useDetectedTimeZoneSync()
  return null
}

describe('useDetectedTimeZoneSync', () => {
  const elsewhere =
    browserDefaultTimeZone === 'Asia/Ho_Chi_Minh'
      ? 'America/New_York'
      : 'Asia/Ho_Chi_Minh'

  const stateWith = (datetime: object, isBrowserDefaultTimeZone: boolean) => ({
    user: {
      userData: { sub: 'test' },
      organiserData: null,
      tokens: null,
      coreConfig: { language: 'en', datetime },
      loading: false,
      error: null
    },
    settings: {
      language: 'en',
      timeZone: browserDefaultTimeZone,
      isBrowserDefaultTimeZone,
      view: 'calendar'
    }
  })

  beforeEach(() => {
    ;(patchConfigurations as Mock).mockResolvedValue({ status: 204 })
  })

  it('hands the detected zone to a backend holding another one', async () => {
    const { store } = renderWithProviders(
      <Probe />,
      stateWith({ timeZone: elsewhere, autoDetect: true }, true)
    )

    await waitFor(() => {
      expect(patchConfigurations).toHaveBeenCalledWith([
        {
          name: 'core',
          configurations: [
            {
              name: 'datetime',
              value: { timeZone: browserDefaultTimeZone, autoDetect: true }
            }
          ]
        }
      ])
    })
    await waitFor(() => {
      expect(store.getState().user.coreConfig.datetime.timeZone).toBe(
        browserDefaultTimeZone
      )
    })
  })

  it('stays quiet once the backend holds the detected zone', () => {
    renderWithProviders(
      <Probe />,
      stateWith({ timeZone: browserDefaultTimeZone, autoDetect: true }, true)
    )

    expect(patchConfigurations).not.toHaveBeenCalled()
  })

  it('stays quiet when the user opted out of the detection', () => {
    renderWithProviders(
      <Probe />,
      stateWith({ timeZone: elsewhere, autoDetect: false }, false)
    )

    expect(patchConfigurations).not.toHaveBeenCalled()
  })

  it('leaves a zone the user pinned while it was in flight alone', async () => {
    let answerPatch: () => void = () => undefined
    ;(patchConfigurations as Mock).mockReturnValue(
      new Promise(resolve => {
        answerPatch = () => resolve({ status: 204 })
      })
    )

    const { store } = renderWithProviders(
      <Probe />,
      stateWith({ timeZone: elsewhere, autoDetect: true }, true)
    )

    await waitFor(() => expect(patchConfigurations).toHaveBeenCalled())

    act(() => {
      store.dispatch(setIsBrowserDefaultTimeZone(false))
      store.dispatch(setUserTimeZone(elsewhere))
    })
    await act(async () => {
      answerPatch()
    })

    expect(store.getState().user.coreConfig.datetime.timeZone).toBe(elsewhere)
  })

  it('leaves a backend that does not know about the flag alone', () => {
    renderWithProviders(<Probe />, stateWith({ timeZone: elsewhere }, true))

    expect(patchConfigurations).not.toHaveBeenCalled()
  })
})
