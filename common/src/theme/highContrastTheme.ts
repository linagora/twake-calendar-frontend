import type { ThemeOptions } from '@mui/material/styles'
import { enUS, frFR, ruRU, viVN } from '@mui/material/locale'
import { merge } from 'lodash'

const MUI_LOCALES: Record<string, ThemeOptions> = {
  en: enUS,
  fr: frFR,
  ru: ruRU,
  vi: viVN
}

/** "fr-fr", "fr" → "fr" */
export const languageCode = (lang: string): string =>
  (lang || 'en').slice(0, 2).toLowerCase()

export type HighContrastApp = 'private' | 'public'

/**
 * R-08: colours of the high contrast mode. Every text colour reaches 4.5:1
 * on white and on the #F3F6F9 page background, white text on every main
 * colour reaches 4.5:1, borders and icons reach 3:1.
 */
export const HIGH_CONTRAST_COLORS = {
  primary: {
    private: { main: '#B5470F', dark: '#9A3C0C' }, // 5.4:1 — Twake orange
    public: { main: '#0057B8', dark: '#00479A' } // 6.9:1 — Twake blue
  },
  error: { main: '#B3261E', dark: '#8C1D18' },
  warning: { main: '#9A4A00', dark: '#7A3B00' },
  success: { main: '#18692B', dark: '#124F20' },
  info: { main: '#006B5F', dark: '#005147' },
  textSecondary: 'rgba(66, 66, 68, 0.85)', // 6.5:1
  placeholder: '#6B6B6E', // 5.3:1
  border: '#8A8A8D', // 3.4:1
  icon: 'rgba(66, 66, 68, 0.8)' // 5.6:1
} as const

/** The calendar palette (palette.json shape) with the high contrast colours */
export const highContrastPaletteData = <
  T extends Record<string, Record<string, string>>
>(
  paletteData: T
): T => {
  const c = HIGH_CONTRAST_COLORS
  return merge({}, paletteData, {
    Primary: { 600: c.primary.private.main, 700: c.primary.private.dark },
    Error: { 600: c.error.main, 700: c.error.dark },
    Warning: { 600: c.warning.main, 700: c.warning.dark },
    Success: { 600: c.success.main, 700: c.success.dark },
    Info: { 600: c.info.main, 700: c.info.dark }
  })
}

const highContrastPalette = (app: HighContrastApp): ThemeOptions => {
  const c = HIGH_CONTRAST_COLORS
  return {
    palette: {
      primary: c.primary[app],
      error: c.error,
      warning: c.warning,
      success: c.success,
      info: c.info,
      text: { secondary: c.textSecondary }
    },
    components: {
      MuiInputBase: {
        styleOverrides: {
          input: {
            '&::placeholder': { color: c.placeholder, opacity: 1 }
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: { borderColor: c.border }
        }
      },
      MuiButton: {
        styleOverrides: {
          outlined: { borderColor: c.border }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: { color: c.icon }
        }
      }
    }
  }
}

/**
 * Theme options of the high contrast mode, merged on top of the application
 * theme when the mode is on (see accessibility/A10Y_REMEDIATIONS).
 */
export const highContrastThemeOptions = (
  lang: string,
  app: HighContrastApp
): ThemeOptions =>
  merge(
    {},
    // R-06: MUI's own texts (Autocomplete "No options", Alert "Close"…) in
    // the language of the user rather than in English
    MUI_LOCALES[languageCode(lang)] ?? enUS,
    // R-08: colours reaching the WCAG contrast ratios
    highContrastPalette(app)
  )

export const withHighContrast = (
  base: ThemeOptions | undefined,
  enabled: boolean,
  lang: string,
  app: HighContrastApp
): ThemeOptions | undefined =>
  enabled ? merge({}, base, highContrastThemeOptions(lang, app)) : base
