import { createTheme, Theme } from '@linagora/twake-mui'
import { makeCalendarOverrides } from '@common/theme/makeCalendarOverrides'

const DAY_SELECTOR = '.MuiDateCalendar-root .MuiPickerDay-root'
const DISABLED_DAY_SELECTOR = `${DAY_SELECTOR}.Mui-disabled:not(.Mui-selected)`

const theme = createTheme({ cssVariables: true })

function dateOverrides(): Record<string, { color?: string }> {
  const components = makeCalendarOverrides(true).components as {
    MuiCssBaseline: {
      styleOverrides: (theme: Theme) => Record<string, { color?: string }>
    }
  }
  return components.MuiCssBaseline.styleOverrides(theme)
}

describe('makeCalendarOverrides', () => {
  it('greys out disabled days instead of drawing them like selectable ones', () => {
    const overrides = dateOverrides()

    expect(overrides[DISABLED_DAY_SELECTOR]?.color).toBe(
      theme.vars.palette.text.disabled
    )
    expect(overrides[DISABLED_DAY_SELECTOR]?.color).not.toBe(
      overrides[DAY_SELECTOR]?.color
    )
  })

  it('does not inject date overrides when not requested', () => {
    const components = makeCalendarOverrides().components as {
      MuiCssBaseline: { styleOverrides: Record<string, unknown> }
    }

    expect(components.MuiCssBaseline.styleOverrides).toEqual({})
  })
})
