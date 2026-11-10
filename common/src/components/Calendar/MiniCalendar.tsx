import { useAppDispatch } from '@common/app/hooks'
import Tooltip from '@common/components/Tooltip'
import { setView } from '@common/features/Settings/SettingsSlice'
import type { CalendarApi } from '@fullcalendar/react'
import { IconButton, SxProps } from '@linagora/twake-mui'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { DateCalendar } from '@mui/x-date-pickers'
import { TwakeLocalizationProvider } from '@common/components/DateTimePicker'
import {
  PickerSelectionState,
  PickerValue
} from '@mui/x-date-pickers/internals'
import dayjs from 'dayjs'
import { forwardRef, useState } from 'react'
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
  const [today] = useState(() => new Date())

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
        // the value is the day the grid shows: browsing the months of the header
        // must not change it, or it lands on the 1st of the month
        value={dayjs(selectedDate ?? today)}
        onChange={handleChange}
        showDaysOutsideCurrentMonth
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
                  backgroundColor: theme =>
                    `${theme.alpha(theme.vars.palette.text.primary, 0.24)} !important`
                },
                '&.today': {
                  background: theme =>
                    `${theme.vars.palette.today.main} !important`,
                  color: theme =>
                    `${theme.vars.palette.today.contrastText} !important`,
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
