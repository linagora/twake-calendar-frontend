import {
  DateCalendar,
  LocalizationProvider,
  PickerDay,
  PickerDayProps
} from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useTheme } from '@mui/material'
import { Dayjs } from 'dayjs'

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
  const { availableDays, day, ...other } = props
  const isSlot = availableDays?.has(day.toDate().toDateString()) ?? false
  const theme = useTheme()

  return (
    <PickerDay
      {...other}
      day={day}
      disabled={!isSlot}
      sx={{
        borderRadius: '50%',
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
}) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DateCalendar
      value={selectedDay}
      onChange={onSelectDay}
      onMonthChange={onMonthChange}
      slots={{ day: AvailableDay }}
      slotProps={{
        day: { availableDays } as AvailableDayProps
      }}
      sx={{
        width: '100%',
        '& .MuiDayCalendar-header, & .MuiDayCalendar-weekContainer': {
          justifyContent: 'space-around'
        }
      }}
    />
  </LocalizationProvider>
)
