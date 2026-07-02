import { BookingHeader } from '@/components/Booking/BookingHeader'
import { Slot } from '@common/features/booking/types/BookingTypes'
import { Box, CircularProgress, Divider, Typography } from '@linagora/twake-mui'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createBooking } from './BookingDao'
import { Dayjs } from 'dayjs'
import { BookingCalendarSection } from '../../components/Booking/BookingCalendarSection'
import { BookingConfirmDialog } from './components/BookingConfirmDialog'
import { BookingTimeSlotSection } from '../../components/Booking/BookingTimeSlotSection'
import { useI18n } from 'twake-i18n'
import { useBookingData } from './hooks/useBookingData'

export const BookingPage: React.FC = () => {
  const { t } = useI18n()
  const { bookingLinkPublicId } = useParams<{
    bookingLinkPublicId: string
  }>()

  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const { slots, bookingInfo, initialLoading, monthLoading, error } =
    useBookingData({
      bookingLinkPublicId,
      visibleMonth,
      loadErrorMessage: t('booking.error.loadFailed')
    })

  const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false)

  // Group slots by calendar day for quick lookup when rendering the grid
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>()
    slots.forEach(slot => {
      const date = new Date(slot.start)
      const key = date.toDateString()
      const existing = map.get(key) ?? []
      existing.push(slot)
      map.set(key, existing)
    })
    return map
  }, [slots])

  const availableDays = useMemo(() => new Set(slotsByDay.keys()), [slotsByDay])

  const slotsForSelectedDay = useMemo<Slot[]>(() => {
    if (!selectedDay) {
      return []
    }
    return slotsByDay.get(selectedDay.toDate().toDateString()) ?? []
  }, [selectedDay, slotsByDay])

  const handleMonthChange = (month: Dayjs): void => {
    setVisibleMonth(new Date(month.year(), month.month(), 1))
    setSelectedDay(null)
    setSelectedSlot(null)
  }

  const handleSelectDay = (date: Dayjs | null): void => {
    setSelectedDay(date)
    setSelectedSlot(null)
  }

  const handleSelectSlot = (slot: Slot): void => {
    setSelectedSlot(slot)
    setConfirmOpen(true)
  }

  const handleCloseConfirm = (): void => {
    setConfirmOpen(false)
  }

  const handleConfirmBooking = async (
    name: string,
    email: string
  ): Promise<void> => {
    if (!bookingLinkPublicId || !selectedSlot) {
      return
    }
    await createBooking(bookingLinkPublicId, {
      startUtc: selectedSlot.start,
      creator: {
        name: name || undefined,
        email
      },
      eventTitle: bookingInfo?.name || t('booking.defaultEventTitle')
    })
    setConfirmOpen(false)
    setSelectedSlot(null)
  }

  const showPanel = !initialLoading && !(error && !bookingInfo)

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        padding: { xs: '24px', sm: '32px' },
        display: 'flex',
        height: '100%',
        flexDirection: 'column'
      }}
    >
      {initialLoading && (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}
        >
          <CircularProgress size={28} />
        </Box>
      )}

      {!initialLoading && error && !bookingInfo && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}

      {showPanel && bookingInfo && <BookingHeader bookingInfo={bookingInfo} />}
      {showPanel && <Divider />}

      {showPanel && (
        <Box sx={{ position: 'relative' }}>
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {monthLoading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                zIndex: 1
              }}
            >
              <CircularProgress size={24} />
            </Box>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '3fr 1fr' }
            }}
          >
            <BookingCalendarSection
              selectedDay={selectedDay}
              availableDays={availableDays}
              onSelectDay={handleSelectDay}
              onMonthChange={handleMonthChange}
            />
            <BookingTimeSlotSection
              selectedDay={selectedDay}
              slots={slotsForSelectedDay}
              selectedSlot={selectedSlot}
              onSelectSlot={handleSelectSlot}
            />
          </Box>
        </Box>
      )}

      <BookingConfirmDialog
        open={confirmOpen}
        onClose={handleCloseConfirm}
        selectedSlot={selectedSlot}
        bookingInfo={bookingInfo}
        onConfirm={handleConfirmBooking}
      />
    </Box>
  )
}

export default BookingPage
