import { Box, useTheme } from '@linagora/twake-mui'
import {
  DateCalendar,
  LocalizationProvider,
  PickerDay,
  PickerDayProps
} from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { Dayjs } from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/fr'
import 'dayjs/locale/ru'
import 'dayjs/locale/vi'
import { useI18n } from 'twake-i18n'

const CELL_SIZE = 66
const WEEK_ROWS = 6 // a month never needs more than 6 rows
const WEEKDAY_LABEL_HEIGHT = CELL_SIZE
const CALENDAR_GRID_HEIGHT = CELL_SIZE * WEEK_ROWS

interface AvailableDayProps extends PickerDayProps {
  availableDays?: Set<string>
}
interface BookingCalendarSectionProps {
  selectedDay: Dayjs | null
  availableDays: Set<string>
  onSelectDay: (date: Dayjs | null) => void
  onMonthChange: (month: Dayjs) => void
}
const AvailableDay = (props: AvailableDayProps): React.ReactElement => {
  const { availableDays, day, outsideCurrentMonth, ...other } = props
  const theme = useTheme()

  if (outsideCurrentMonth) {
    return (
      <Box
        sx={{
          boxSizing: 'border-box',
          width: CELL_SIZE,
          height: CELL_SIZE,
          minWidth: CELL_SIZE,
          maxWidth: CELL_SIZE,
          minHeight: CELL_SIZE,
          maxHeight: CELL_SIZE
        }}
      />
    )
  }
  const isSlot = availableDays?.has(day.toDate().toDateString()) ?? false
  return (
    <PickerDay
      {...other}
      day={day}
      outsideCurrentMonth={outsideCurrentMonth}
      disabled={!isSlot}
      sx={{
        boxSizing: 'border-box',
        width: CELL_SIZE,
        height: CELL_SIZE,
        minWidth: CELL_SIZE,
        maxWidth: CELL_SIZE,
        minHeight: CELL_SIZE,
        maxHeight: CELL_SIZE,
        flexShrink: 0,
        margin: 0,
        padding: 0,
        borderRadius: '50%',
        fontSize: '14px',
        ...(isSlot && {
          '&:not(.Mui-selected)': { backgroundColor: theme.palette.grey[200] },
          '&.Mui-selected': { backgroundColor: 'text.secondary' }
        })
      }}
    />
  )
}
export const BookingCalendarSection: React.FC<BookingCalendarSectionProps> = ({
  selectedDay,
  availableDays,
  onSelectDay,
  onMonthChange
}) => {
  const { t } = useI18n()
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: '24px',
        gap: '16px'
      }}
    >
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={t('locale') ?? 'en-gb'}
      >
        <DateCalendar
          value={selectedDay}
          onChange={onSelectDay}
          onMonthChange={onMonthChange}
          slots={{ day: AvailableDay }}
          showDaysOutsideCurrentMonth
          fixedWeekNumber={6}
          slotProps={{
            day: { availableDays } as AvailableDayProps
          }}
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: '900px',
            overflow: 'visible',
            p: '0px',
            m: '0px',
            '& .MuiPickersCalendarHeader-root': {
              p: '0px',
              m: '0px',
              justifyContent: 'space-between'
            },
            '& .MuiPickersCalendarHeader-labelContainer': {
              m: '0px'
            },
            '& .MuiPickersArrowSwitcher-root': {
              m: '0px'
            },
            '& .MuiDayCalendar-header, & .MuiDayCalendar-weekContainer': {
              width: '100%',
              justifyContent: 'space-between',
              m: '0px'
            },
            '& .MuiDayCalendar-weekDayLabel': {
              width: CELL_SIZE,
              height: WEEKDAY_LABEL_HEIGHT
            },
            '& .MuiDayCalendar-monthContainer': {
              width: '100%',
              height: 'auto',
              minHeight: CALENDAR_GRID_HEIGHT,
              overflow: 'visible'
            },
            '& .MuiDayCalendar-slideTransition': {
              width: '100%',
              height: 'auto',
              minHeight: CALENDAR_GRID_HEIGHT,
              overflow: 'visible'
            }
          }}
        />
      </LocalizationProvider>
    </Box>
  )
}
