import { makePalette } from '@linagora/twake-mui'
import { makeCalendarOverrides } from '@common/theme/makeCalendarOverrides'
import paletteData from '@common/theme/palette.json'

const DAY_SELECTOR = '.MuiDateCalendar-root .MuiPickerDay-root'
const DISABLED_DAY_SELECTOR = `${DAY_SELECTOR}.Mui-disabled:not(.Mui-selected)`

function dateOverrides(): Record<string, { color?: string }> {
  const components = makeCalendarOverrides(true).components as {
    MuiCssBaseline: { styleOverrides: Record<string, { color?: string }> }
  }
  return components.MuiCssBaseline.styleOverrides
}

describe('makeCalendarOverrides', () => {
  it('greys out disabled days instead of drawing them like selectable ones', () => {
    const overrides = dateOverrides()
    const disabledColor = makePalette('light', paletteData).text.disabled

    expect(overrides[DISABLED_DAY_SELECTOR]?.color).toBe(disabledColor)
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
