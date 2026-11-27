import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { TdrivePickerDialog } from '@common/features/Tdrive/components/TdrivePickerDialog'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('TdrivePickerDialog', () => {
  it('shows the Drive picker skeleton until the intent is ready', async () => {
    let markReady: () => void = () => undefined
    render(
      <TwakeMuiThemeProvider>
        <TdrivePickerDialog
          open
          onClose={vi.fn()}
          containerRef={{ current: null }}
          onReadyToUse={callback => {
            markReady = callback
          }}
        />
      </TwakeMuiThemeProvider>
    )

    expect(
      await screen.findByTestId('drive-picker-skeleton')
    ).toBeInTheDocument()

    act(() => markReady())

    expect(screen.queryByTestId('drive-picker-skeleton')).toBe(null)
  })
})
