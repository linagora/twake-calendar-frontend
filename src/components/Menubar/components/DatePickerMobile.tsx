import { CalendarApi } from '@fullcalendar/core'
import { useTheme } from '@linagora/twake-mui'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import React from 'react'
import { useI18n } from 'twake-i18n'
import dayjs from 'dayjs'
import { PickerValue } from '@mui/x-date-pickers/internals'
import { MonthSelector } from './MonthSelector'

export type DatePickerMobileProps = {
  calendarRef: React.RefObject<CalendarApi | null>
  currentDate: Date
  onDateChange?: (date: Date) => void
}

export const DatePickerMobile: React.FC<DatePickerMobileProps> = ({
  calendarRef,
  currentDate,
  onDateChange
}) => {
  const { t, lang } = useI18n()
  const theme = useTheme()

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
        onChange={onChangeDate}
        showDaysOutsideCurrentMonth
        slots={{ calendarHeader: () => null, actionBar: () => null }}
        sx={{ width: '100%', marginTop: '10px' }}
        slotProps={{
          toolbar: { hidden: true },
          layout: {
            sx: {
              '.MuiDateCalendar-root': {
                width: '100%',
                margin: 0,
                maxWidth: 'unset',
                maxHeight: 'unset',
                height: '400px'
              },
              '.MuiDayCalendar-header': {
                width: '100%',
                justifyContent: 'space-around'
              },
              '.MuiDayCalendar-weekContainer': {
                width: '100%',
                justifyContent: 'space-around'
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
