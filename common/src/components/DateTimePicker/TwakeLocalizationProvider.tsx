import React, { useMemo } from 'react'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useI18n } from 'twake-i18n'
import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/en'
import 'dayjs/locale/fr'
import 'dayjs/locale/ru'
import 'dayjs/locale/vi'
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles'

dayjs.extend(utc)
dayjs.extend(timezone)

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
        adapterLocale={locale ?? 'en'}
        localeText={{
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
