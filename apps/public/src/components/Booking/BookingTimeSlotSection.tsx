import { Slot } from '@common/features/booking/types/BookingTypes'
import { DayBadge } from '@common/features/Search/searchResultsComponents'
import { Box, Button, Typography } from '@linagora/twake-mui'
import { Dayjs } from 'dayjs'
import { useI18n } from 'twake-i18n'

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

  if (!selectedDay) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: '24px',
          gap: '16px'
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('booking.selectDayPrompt')}
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', p: '24px', gap: '16px' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <DayBadge
          dayNum={selectedDay.date().toString()}
          dayName={selectedDay.toDate().toLocaleDateString(lang, {
            weekday: 'short'
          })}
          isToday
        />
      </Box>
      <Box
        sx={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'transparent transparent',
          scrollbarGutter: 'stable',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '370px',
          overflowY: 'auto',
          '&:hover': {
            scrollbarColor: 'divider divider'
          },
          '&:hover::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider'
          }
        }}
      >
        {slots.map(slot => {
          const time = new Date(slot.start).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
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
        {slots.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('booking.noSlots')}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
