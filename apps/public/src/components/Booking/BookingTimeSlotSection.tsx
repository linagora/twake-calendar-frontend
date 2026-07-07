import { Slot } from '@common/features/booking/types/BookingTypes'
import { DayBadge } from '@common/features/Search/searchResultsComponents'
import {
  Box,
  Button,
  SxProps,
  Theme,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import dayjs, { Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { getLayoutConstants } from './LayoutConstants'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'

const DAY_BADGE_ROW_HEIGHT = 48
const SLOT_LIST_GAP = 16

const NOW_REFRESH_INTERVAL_MS = 60_000 // 1 min: slot granularity doesn't need finer resolution

const containerSx = {
  display: 'flex',
  flexDirection: 'column',
  p: 3,
  gap: 2
} as const

const scrollableListSx = (
  theme: { palette: { grey: { 400: string } } },
  slotListMaxHeight: number
): SxProps<Theme> => ({
  scrollbarWidth: 'thin',
  scrollbarColor: 'transparent transparent',
  scrollbarGutter: 'stable',
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  pr: 1,
  maxHeight: `${slotListMaxHeight}px`,
  overflowY: 'auto',
  '&:hover': {
    scrollbarColor: `${theme.palette.grey[400]} transparent`
  },
  '&:hover::-webkit-scrollbar-thumb': {
    backgroundColor: 'divider'
  }
})

const EmptyMessage: React.FC<{ message: string }> = ({ message }) => (
  <Box sx={containerSx}>
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {message}
    </Typography>
  </Box>
)

interface SlotListProps {
  slots: Slot[]
  selectedSlot: Slot | null
  onSelectSlot: (slot: Slot) => void
  lang: string
}

const SlotList: React.FC<SlotListProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  lang
}) => {
  const theme = useTheme()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const { CALENDAR_CONTENT_HEIGHT } = getLayoutConstants(isMobile)

  const SLOT_LIST_MAX_HEIGHT =
    CALENDAR_CONTENT_HEIGHT - DAY_BADGE_ROW_HEIGHT - SLOT_LIST_GAP
  return (
    <Box sx={scrollableListSx(theme, SLOT_LIST_MAX_HEIGHT)}>
      {slots.map(slot => {
        const time = new Date(slot.start).toLocaleTimeString(lang, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        const isSelected = selectedSlot?.start === slot.start

        return (
          <Button
            key={slot.start}
            variant="outlined"
            color={isSelected ? 'warning' : 'inherit'}
            onClick={() => onSelectSlot(slot)}
            sx={{ justifyContent: 'center' }}
          >
            {time}
          </Button>
        )
      })}
    </Box>
  )
}

interface BookingTimeSlotSectionProps {
  selectedDay: Dayjs | null
  slots: Slot[]
  selectedSlot: Slot | null
  onSelectSlot: (slot: Slot) => void
}

export const BookingTimeSlotSection: React.FC<BookingTimeSlotSectionProps> = ({
  selectedDay,
  slots,
  selectedSlot,
  onSelectSlot
}) => {
  const { t, lang } = useI18n()

  const [now, setNow] = useState(() => Date.now())
  const isSelectedDayToday = selectedDay?.isSame(dayjs(), 'day')
  const visibleSlots = isSelectedDayToday
    ? slots.filter(slot => new Date(slot.start).getTime() >= now)
    : slots

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), NOW_REFRESH_INTERVAL_MS)
    return (): void => clearInterval(id)
  }, [])

  if (!selectedDay) {
    return <EmptyMessage message={t('booking.selectDayPrompt')} />
  }

  if (!visibleSlots.length) {
    return <EmptyMessage message={t('booking.noSlots')} />
  }

  return (
    <Box sx={containerSx}>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <DayBadge
          dayNum={selectedDay.date().toString()}
          dayName={selectedDay.toDate().toLocaleDateString(lang, {
            weekday: 'short'
          })}
          isToday
        />
      </Box>
      <SlotList
        slots={visibleSlots}
        selectedSlot={selectedSlot}
        onSelectSlot={onSelectSlot}
        lang={lang}
      />
    </Box>
  )
}
