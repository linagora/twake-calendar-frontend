import { Box, useTheme } from '@linagora/twake-mui'
import {
  DateCalendar,
  DateView,
  PickerDay,
  PickerDayProps
} from '@mui/x-date-pickers'
import dayjs, { Dayjs } from 'dayjs'
import { useState } from 'react'
import { getLayoutConstants } from './LayoutConstants'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { PickerValue } from '@mui/x-date-pickers/internals'
import { TwakeLocalizationProvider } from '@common/components/DateTimePicker'

interface AvailableDayProps extends PickerDayProps {
  availableDays?: Set<string>
  selectedTimezone?: string
}
interface BookingCalendarSectionProps {
  selectedDay: Dayjs | null
  availableDays: Set<string>
  onSelectDay: (date: PickerValue | null) => void
  onMonthChange: (month: Dayjs) => void
  selectedTimezone: string
}
const AvailableDay = (props: AvailableDayProps): React.ReactElement => {
  const {
    availableDays,
    selectedTimezone,
    day,
    outsideCurrentMonth,
    ...other
  } = props
  const theme = useTheme()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const { CELL_SIZE } = getLayoutConstants(isMobile)

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
  const isSlot = availableDays?.has(day.format('YYYY-MM-DD')) ?? false

  const todayInTimezone = selectedTimezone
    ? dayjs().tz(selectedTimezone).startOf('day')
    : dayjs().startOf('day')

  const isBeforeToday = day.isBefore(todayInTimezone, 'day')

  return (
    <PickerDay
      {...other}
      day={day}
      outsideCurrentMonth={outsideCurrentMonth}
      disabled={!isSlot || isBeforeToday}
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
        ...(isSlot &&
          !isBeforeToday && {
            '&:not(.Mui-selected)': {
              backgroundColor: theme.palette.grey[200]
            },
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
  onMonthChange,
  selectedTimezone
}) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const { CELL_SIZE, WEEKDAY_LABEL_HEIGHT, CALENDAR_GRID_HEIGHT, ROW_GAP } =
    getLayoutConstants(isMobile)

  const [view, setView] = useState<DateView>('day')

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: '24px',
        gap: '16px'
      }}
    >
      <TwakeLocalizationProvider>
        <DateCalendar
          value={selectedDay}
          onChange={onSelectDay}
          onMonthChange={month => {
            setView('day')
            onMonthChange(month)
          }}
          view={view}
          onViewChange={setView}
          slots={{ day: AvailableDay }}
          showDaysOutsideCurrentMonth
          views={['day', 'month']}
          fixedWeekNumber={6}
          slotProps={{
            day: { availableDays, selectedTimezone } as AvailableDayProps
          }}
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: '900px',
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
            '& .MuiDayCalendar-weekContainer': {
              width: '100%',
              justifyContent: 'space-between',
              m: '0px',
              '&:not(:last-of-type)': {
                marginBottom: `${ROW_GAP}px`
              }
            },
            '& .MuiDayCalendar-slideTransition': {
              width: '100%',
              height: 'auto',
              minHeight: CALENDAR_GRID_HEIGHT,
              overflow: 'visible'
            }
          }}
        />
      </TwakeLocalizationProvider>
    </Box>
  )
}
