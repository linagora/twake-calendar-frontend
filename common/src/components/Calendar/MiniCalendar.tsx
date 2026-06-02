import { useAppDispatch } from '@common/app/hooks'
import Tooltip from '@common/components/Tooltip'
import { setView } from '@common/features/Settings/SettingsSlice'
import { computeStartOfTheWeek } from '@common/utils/dateUtils'
import type { CalendarApi } from '@fullcalendar/core'
import { IconButton, SxProps } from '@linagora/twake-mui'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { DateCalendar } from '@mui/x-date-pickers'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import {
  PickerSelectionState,
  PickerValue
} from '@mui/x-date-pickers/internals'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import moment from 'moment'
import { forwardRef, useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { CALENDAR_VIEWS } from './utils/constants'

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
  selectedDate: Date
  setSelectedMiniDate: (d: Date) => void
}> = ({ calendarRef, selectedDate, setSelectedMiniDate }) => {
  const dispatch = useAppDispatch()
  const [visibleDate, setVisibleDate] = useState(selectedDate)
  const { t } = useI18n()

  useEffect(() => {
    const handleVisibleDateChange = (): void => {
      setVisibleDate(selectedDate)
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
    <LocalizationProvider
      dateAdapter={AdapterMoment}
      adapterLocale={t('locale') ?? 'en-gb'}
    >
      <DateCalendar
        value={moment(visibleDate)}
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
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const selected = new Date(selectedDate)
            selected.setHours(0, 0, 0, 0)

            const isToday = date.getTime() === today.getTime()
            const isSelectedDay =
              calendarRef.current?.view.type === CALENDAR_VIEWS.timeGridDay &&
              date.getTime() === selected.getTime()

            const isInSelectedWeek =
              calendarRef.current?.view.type === CALENDAR_VIEWS.timeGridWeek ||
              calendarRef.current?.view.type === undefined
                ? ((): boolean => {
                    const startOfWeek = computeStartOfTheWeek(selected)
                    const endOfWeek = new Date(startOfWeek)
                    endOfWeek.setDate(startOfWeek.getDate() + 6)
                    endOfWeek.setHours(23, 59, 59, 999)
                    return date >= startOfWeek && date <= endOfWeek
                  })()
                : false

            const classNames = [
              isToday ? 'today' : '',
              isSelectedDay ? 'selectedDay' : '',
              isInSelectedWeek ? 'selectedWeek' : ''
            ].join(' ')

            return {
              className: classNames,
              selected: classNames.includes('selectedWeek'),
              outsideCurrentMonth: ownerState.isDayOutsideMonth,
              style: {
                backgroundColor: 'transparent',
                position: 'relative',
                flexDirection: 'column',
                border: 0
              },
              sx: {
                '&.Mui-selected': {
                  color: 'inherit !important',
                  fontWeight: 'inherit !important'
                },
                '&.selectedDay': {
                  backgroundColor: 'lightgray !important'
                },
                '&.today': {
                  background: 'orange !important',
                  color: 'white !important'
                }
              },
              'data-testid': `date-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
              children: <>{ownerState.day.date()}</>
            }
          }
        }}
      />
    </LocalizationProvider>
  )
}
