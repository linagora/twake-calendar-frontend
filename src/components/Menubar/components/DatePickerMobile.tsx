import { CalendarApi } from '@fullcalendar/core'
import { useTheme } from '@linagora/twake-mui'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import React, { useMemo } from 'react'
import { useI18n } from 'twake-i18n'
import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import { PickerValue } from '@mui/x-date-pickers/internals'
import { MonthSelector } from './MonthSelector'

dayjs.extend(localeData)

export type DatePickerMobileProps = {
  calendarRef: React.RefObject<CalendarApi | null>
  currentDate: Date
  onDateChange?: (date: Date) => void
  onCloseDatePicker: () => void
}

// Calculate dynamic height based on month's week count
const calculateCalendarHeightByMonth = (
  currentDate: Date,
  lang: string
): {
  rootMinHeight: number
  calendarHeight: number
  slideTransitionMinHeight: number
} => {
  const date = dayjs(currentDate).locale(lang)
  const firstDay = date.startOf('month')

  const localeWeekStart = date.localeData().firstDayOfWeek()
  const firstDayOfWeek = firstDay.day()

  // Calculate days from start of month to first Sunday
  // This determines how many days from previous month are shown
  const daysFromPrevMonth = (firstDayOfWeek - localeWeekStart + 7) % 7

  const daysInCurrentMonth = firstDay.daysInMonth()

  // Total days displayed in calendar grid
  const totalDaysDisplayed = daysFromPrevMonth + daysInCurrentMonth

  // Calculate number of weeks needed (always round up to fill complete weeks)
  const weekCount = Math.ceil(totalDaysDisplayed / 7)

  // For showDaysOutsideCurrentMonth, most months will show 5-6 weeks
  const adjustedWeekCount = Math.max(4, weekCount) // Minimum 4 weeks for consistency

  // Base height per week + some padding
  const baseHeightPerWeek = 50
  const padding = 80
  const minHeight = 200 // Minimum height for 4 weeks
  const maxHeight = 400 // Maximum height for 6 weeks
  const rootMinHeightOffset = 120
  const slideTransitionOffset = 100

  const calculatedHeight = Math.max(
    minHeight,
    Math.min(maxHeight, adjustedWeekCount * baseHeightPerWeek + padding)
  )

  return {
    rootMinHeight: Math.max(minHeight, calculatedHeight - rootMinHeightOffset),
    calendarHeight: calculatedHeight,
    slideTransitionMinHeight: Math.max(
      minHeight,
      calculatedHeight - slideTransitionOffset
    )
  }
}

export const DatePickerMobile: React.FC<DatePickerMobileProps> = ({
  calendarRef,
  currentDate,
  onDateChange,
  onCloseDatePicker
}) => {
  const { t, lang } = useI18n()
  const theme = useTheme()

  const { rootMinHeight, calendarHeight, slideTransitionMinHeight } = useMemo(
    () => calculateCalendarHeightByMonth(currentDate, lang ?? 'en'),
    [currentDate, lang]
  )

  const onChangeDate = (newDate: PickerValue): void => {
    if (newDate && calendarRef.current) {
      const d = newDate.toDate()
      calendarRef.current.gotoDate(d)
      onDateChange?.(d)
    }
  }

  const onMonthChange = (monthIndex: number): void => {
    if (!calendarRef.current) return
    const currentCalendarDate = calendarRef.current.getDate()
    const year = currentCalendarDate.getFullYear()
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate()
    const clampedDay = Math.min(currentCalendarDate.getDate(), lastDayOfMonth)
    onChangeDate(dayjs(new Date(year, monthIndex, clampedDay)))
  }

  const handlePickDate = (newDate: PickerValue): void => {
    onChangeDate(newDate)
    onCloseDatePicker()
    calendarRef.current?.updateSize?.()
  }

  return (
    <LocalizationProvider
      key={lang}
      dateAdapter={AdapterDayjs}
      adapterLocale={lang ?? 'en'}
      localeText={{
        okButtonLabel: t('common.ok'),
        cancelButtonLabel: t('common.cancel'),
        todayButtonLabel: t('menubar.today')
      }}
    >
      <StaticDatePicker
        value={dayjs(currentDate)}
        onChange={handlePickDate}
        showDaysOutsideCurrentMonth
        slots={{ calendarHeader: () => null, actionBar: () => null }}
        sx={{
          width: '100%',
          marginTop: '10px',
          minHeight: `${rootMinHeight}px`,
          maxHeight: '300px'
        }}
        slotProps={{
          toolbar: { hidden: true },
          layout: {
            sx: {
              '.MuiDateCalendar-root': {
                width: '100%',
                margin: 0,
                maxWidth: 'none',
                maxHeight: '400px',
                height: `${calendarHeight}px`
              },
              '.MuiDayCalendar-header': {
                width: '100%',
                justifyContent: 'space-around'
              },
              '.MuiDayCalendar-weekContainer': {
                width: '100%',
                justifyContent: 'space-around'
              },
              '.MuiDateCalendar-root .MuiDayCalendar-slideTransition': {
                minHeight: `${slideTransitionMinHeight}px`,
                maxHeight: '300px'
              }
            }
          },
          day: {
            sx: {
              '&.MuiPickersDay-dayOutsideMonth': {
                color: theme.palette.grey[500]
              }
            }
          }
        }}
      />
      <MonthSelector currentDate={currentDate} onMonthChange={onMonthChange} />
    </LocalizationProvider>
  )
}
