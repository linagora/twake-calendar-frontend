import { darken, getContrastRatio, lighten, Theme } from '@linagora/twake-mui'
import { defaultColors } from './defaultColors'

export function getAccessiblePair(baseColor: string, theme: Theme): string {
  const isDefault = defaultColors.find(
    c => c.light === baseColor || c.dark === baseColor
  )

  if (isDefault) return isDefault.dark

  if (typeof baseColor !== 'string') {
    return theme.palette.getContrastText('#000')
  }

  const contrastToBlack = getContrastRatio(baseColor, '#000')
  const contrastToWhite = getContrastRatio(baseColor, '#fff')
  const isLight = contrastToBlack > contrastToWhite

  const adjusted = isLight ? darken(baseColor, 0.6) : lighten(baseColor, 0.7)

  // Check if contrast meets 4.5
  const contrast = getContrastRatio(baseColor, adjusted)
  if (contrast >= 4.5) return adjusted

  if (isLight) {
    return '#ffffffff'
  }

  return theme.palette.getContrastText(baseColor)
}
