import { useAppDispatch } from '@common/app/hooks'
import Tooltip from '@common/components/Tooltip'
import { setView } from '@common/features/Settings/SettingsSlice'
import type { CalendarApi } from '@fullcalendar/core'
import { IconButton, SxProps } from '@linagora/twake-mui'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { DateCalendar } from '@mui/x-date-pickers'
import { TwakeLocalizationProvider } from '@common/components/DateTimePicker'
import {
  PickerSelectionState,
  PickerValue
} from '@mui/x-date-pickers/internals'
import dayjs from 'dayjs'
import { forwardRef, useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'

const NextIconButton = forwardRef<
  HTMLButtonElement,
  { sx?: SxProps; [key: string]: unknown }
>((props, ref) => {
  const { t } = useI18n()
  const { sx: propSx, ...rest } = props
  return (
    <Tooltip title={t('tooltip.nextMonth')}>
      <IconButton
        {...rest}
        ref={ref}
        title={undefined}
        sx={{
          ...(propSx as SxProps),
          '&::after': {
            display: 'none !important',
            content: '"none !important"'
          },
          '&::before': {
            display: 'none !important',
            content: '"none !important"'
          }
        }}
      />
    </Tooltip>
  )
})
NextIconButton.displayName = 'NextIconButton'

const PreviousIconButton = forwardRef<
  HTMLButtonElement,
  { sx?: SxProps; [key: string]: unknown }
>((props, ref) => {
  const { t } = useI18n()
  const { sx: propSx, ...rest } = props
  return (
    <Tooltip title={t('tooltip.previousMonth')}>
      <IconButton
        {...rest}
        ref={ref}
        title={undefined}
        sx={{
          ...(propSx as SxProps),
          '&::after': {
            display: 'none !important',
            content: '"none !important"'
          },
          '&::before': {
            display: 'none !important',
            content: '"none !important"'
          }
        }}
      />
    </Tooltip>
  )
})
PreviousIconButton.displayName = 'PreviousIconButton'

export const MiniCalendar: React.FC<{
  calendarRef: React.MutableRefObject<CalendarApi | null>
  selectedDate: Date | null
  setSelectedMiniDate: (d: Date) => void
}> = ({ calendarRef, selectedDate, setSelectedMiniDate }) => {
  const dispatch = useAppDispatch()
  const [visibleDate, setVisibleDate] = useState(selectedDate ?? new Date())

  useEffect(() => {
    const handleVisibleDateChange = (): void => {
      if (selectedDate) {
        setVisibleDate(selectedDate)
      }
    }
    handleVisibleDateChange()
  }, [selectedDate])

  const handleChange = (
    dateMoment: PickerValue,
    selectionState?: PickerSelectionState
  ): void => {
    if (!dateMoment) return
    const date = dateMoment.toDate()
    if (selectionState === 'finish') {
      dispatch(setView('calendar'))
      setSelectedMiniDate(date)
      calendarRef.current?.gotoDate(date)
    }
  }

  return (
    <TwakeLocalizationProvider>
      <DateCalendar
        value={dayjs(visibleDate)}
        onChange={handleChange}
        showDaysOutsideCurrentMonth
        onMonthChange={month => {
          setVisibleDate(month.toDate())
        }}
        views={['month', 'day']}
        slots={{
          switchViewIcon: KeyboardArrowDownIcon,
          nextIconButton: NextIconButton,
          previousIconButton: PreviousIconButton
        }}
        sx={{
          width: '100%',
          height: '300px',
          '& .MuiPickersCalendarHeader-root': {
            marginTop: 3
          }
        }}
        slotProps={{
          day: ownerState => {
            const date = ownerState.day.toDate()
            const today = dayjs()

            const isToday = ownerState.day.isSame(today, 'day')
            const isSelected =
              selectedDate &&
              date.getTime() === new Date(selectedDate).setHours(0, 0, 0, 0)
            const classNames = [isToday ? 'today' : ''].join(' ')

            return {
              className: classNames,
              selected: isSelected,
              outsideCurrentMonth: ownerState.isDayOutsideMonth,
              style: {
                position: 'relative',
                flexDirection: 'column',
                border: 0
              },
              sx: {
                '&.Mui-selected': {
                  color: 'inherit !important',
                  fontWeight: 'inherit !important',
                  backgroundColor: 'lightgray !important'
                },
                '&.today': {
                  background: 'orange !important',
                  color: 'white !important',
                  outline: 'none'
                }
              },
              'data-testid': `date-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
              children: <>{ownerState.day.date()}</>
            }
          }
        }}
      />
    </TwakeLocalizationProvider>
  )
}
