import React, { useMemo } from 'react'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import {
  deDE,
  enUS,
  esES,
  frFR,
  itIT,
  ruRU,
  viVN
} from '@mui/x-date-pickers/locales'
import { useI18n } from 'twake-i18n'
import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import updateLocale from 'dayjs/plugin/updateLocale'
import 'dayjs/locale/en'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/de'
import 'dayjs/locale/it'
import 'dayjs/locale/ru'
import 'dayjs/locale/vi'
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(updateLocale)
dayjs.updateLocale('en', { weekStart: 1 })

/**
 * Dayjs registers its locales under their base language code ('de', 'fr'),
 * while the translation files declare a region ('de-de', 'fr-fr').
 * The date pickers look the locale up as given, so pass the base code.
 */
export const toAdapterLocale = (locale?: string): string =>
  (locale || 'en').toLowerCase().split('-')[0]

const PICKERS_LOCALES: Record<string, typeof enUS> = {
  en: enUS,
  fr: frFR,
  de: deDE,
  es: esES,
  it: itIT,
  ru: ruRU,
  vi: viVN
}

type PickersLocaleText =
  typeof enUS.components.MuiLocalizationProvider.defaultProps.localeText

/**
 * Corrections of texts MUI X ships wrong for a locale.
 */
const PICKERS_LOCALE_FIXES: Record<string, Partial<PickersLocaleText>> = {
  it: {
    calendarViewSwitchingButtonAriaLabel: view =>
      view === 'year'
        ? "la vista dell'anno è aperta, passare alla vista del calendario"
        : "la vista del calendario è aperta, passare alla vista dell'anno"
  }
}

/**
 * The accessible names of the date pickers (month navigation, view switch...)
 * shipped by MUI X for the given locale, English when none matches.
 */
export const pickersLocaleText = (locale?: string): PickersLocaleText => {
  const language = toAdapterLocale(locale)
  return {
    ...(PICKERS_LOCALES[language] ?? enUS).components.MuiLocalizationProvider
      .defaultProps.localeText,
    ...PICKERS_LOCALE_FIXES[language]
  }
}

export interface TwakeLocalizationProviderProps {
  children: React.ReactNode
}

export const TwakeLocalizationProvider = ({
  children
}: TwakeLocalizationProviderProps): React.ReactElement => {
  const { t } = useI18n()
  const locale = t('locale')
  const outerTheme = useTheme()

  const themeWithPickers = useMemo(() => {
    if (locale !== 'vi') return outerTheme
    const dayOfWeekFormatter = (date: Dayjs): string => date.format('dd')
    return createTheme(outerTheme, {
      components: {
        MuiDateCalendar: { defaultProps: { dayOfWeekFormatter } },
        MuiDatePicker: { defaultProps: { dayOfWeekFormatter } },
        MuiDesktopDatePicker: { defaultProps: { dayOfWeekFormatter } },
        MuiMobileDatePicker: { defaultProps: { dayOfWeekFormatter } },
        MuiStaticDatePicker: { defaultProps: { dayOfWeekFormatter } }
      }
    })
  }, [outerTheme, locale])

  return (
    <ThemeProvider theme={themeWithPickers}>
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={toAdapterLocale(locale)}
        localeText={{
          ...pickersLocaleText(locale),
          okButtonLabel: t('common.ok'),
          cancelButtonLabel: t('common.cancel'),
          todayButtonLabel: t('menubar.today')
        }}
      >
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  )
}
