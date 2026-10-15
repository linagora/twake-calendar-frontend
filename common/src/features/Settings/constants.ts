export const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ru', label: 'Русский' },
  { code: 'vi', label: 'Tiếng Việt' }
] as const

// Values of the core.theme user setting: `auto` follows the system
export const THEME_SETTINGS = ['light', 'dark', 'auto'] as const

export type ThemeSetting = (typeof THEME_SETTINGS)[number]
