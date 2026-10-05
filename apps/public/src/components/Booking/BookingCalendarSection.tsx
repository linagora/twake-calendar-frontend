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
import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'

interface AvailableDayProps extends PickerDayProps {
  availableDays?: Set<string>
  selectedTimezone?: string
}
const isBeforeTodayIn = (day: Dayjs, timezone?: string): boolean => {
  const todayInTimezone = timezone
    ? dayjs().tz(timezone).startOf('day')
    : dayjs().startOf('day')
  return day.isBefore(todayInTimezone, 'day')
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
      // An empty cell keeps the grid of the date picker consistent
      <Box
        role="gridcell"
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
  const isBeforeToday = isBeforeTodayIn(day, selectedTimezone)

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
            '&:not(.Mui-selected):hover': {
              backgroundColor: theme.palette.grey[300]
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
  const highContrast = useHighContrast()
  const { CELL_SIZE, WEEKDAY_LABEL_HEIGHT, CALENDAR_GRID_HEIGHT, ROW_GAP } =
    getLayoutConstants(isMobile)

  const [view, setView] = useState<DateView>('day')

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // R-13, high contrast mode: 7 cells of 40px fit in 320px (WCAG 1.4.10)
        p: highContrast && isMobile ? '12px' : '24px',
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
          // Also known to the date grid, so that arrow keys skip these days
          // instead of moving the focus to a disabled button
          shouldDisableDate={day =>
            !availableDays.has(day.format('YYYY-MM-DD')) ||
            isBeforeTodayIn(day, selectedTimezone)
          }
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
