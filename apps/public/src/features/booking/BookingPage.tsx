import { BookingHeader } from '@/components/Booking/BookingHeader'
import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'
import { DayBadge } from '@common/features/Search/searchResultsComponents'
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Typography
} from '@linagora/twake-mui'
import {
  DateCalendar,
  LocalizationProvider,
  PickerDay,
  PickerDayProps
} from '@mui/x-date-pickers'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createBooking, fetchBookingSlots } from './BookingDao'
import { useTheme } from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { Dayjs } from 'dayjs'
import { BookingConfirmDialog } from './components/BookingConfirmDialog'
import { useI18n } from 'twake-i18n'

interface AvailableDayProps extends PickerDayProps {
  availableDays: Set<string>
}

// Custom day cell: marks days that have at least one slot, disables the rest
const AvailableDay = (props: AvailableDayProps): React.ReactElement => {
  const { availableDays, day, ...other } = props
  const isSlot = availableDays.has(day.toDate().toDateString())
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

export const BookingPage: React.FC = () => {
  const { t } = useI18n()
  const { bookingLinkPublicId } = useParams<{
    bookingLinkPublicId: string
  }>()

  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookingInfo, setBookingInfo] = useState<BookingSlotsResponse | null>(
    null
  )
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false)

  useEffect(() => {
    const loadBookingData = async (): Promise<void> => {
      if (!bookingLinkPublicId) {
        return
      }
      setLoading(true)
      setError(null)
      try {
        const from = visibleMonth.toISOString()
        const to = new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth() + 1,
          0,
          23,
          59,
          59
        ).toISOString()
        const response = await fetchBookingSlots(bookingLinkPublicId, from, to)
        setSlots(response.slots)
        setBookingInfo(response)
      } catch {
        setError(t('booking.error.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    loadBookingData()
  }, [bookingLinkPublicId, visibleMonth])

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
      eventTitle: bookingInfo?.eventTitle || t('booking.defaultEventTitle')
    })
    setConfirmOpen(false)
    setSelectedSlot(null)
  }

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        padding: { xs: '24px', sm: '32px' },
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      {loading && (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}
        >
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}

      {!loading && !error && bookingInfo && (
        <BookingHeader bookingInfo={bookingInfo} />
      )}
      <Divider />
      {!loading && !error && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '614.91px 1fr' },
            gap: '32px',
            overflow: 'visible'
          }}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
              value={selectedDay}
              onChange={handleSelectDay}
              onMonthChange={handleMonthChange}
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
          <Box>
            {selectedDay ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <DayBadge
                    dayNum={selectedDay.date().toString()}
                    dayName={selectedDay.toDate().toLocaleDateString('en-US', {
                      weekday: 'short'
                    })}
                    isToday
                  />
                </Box>
                <Box
                  sx={{
                    scrollbarWidth: 'thin',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '320px',
                    overflowY: 'auto'
                  }}
                >
                  {slotsForSelectedDay.map(slot => {
                    const time = new Date(slot.start).toLocaleTimeString(
                      undefined,
                      {
                        hour: '2-digit',
                        minute: '2-digit'
                      }
                    )
                    const isSelected = selectedSlot?.start === slot.start
                    return (
                      <Button
                        key={slot.start}
                        variant="outlined"
                        color={isSelected ? 'warning' : 'inherit'}
                        onClick={() => handleSelectSlot(slot)}
                        sx={{ justifyContent: 'center' }}
                      >
                        {time}
                      </Button>
                    )
                  })}
                  {slotsForSelectedDay.length === 0 && (
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary' }}
                    >
                      {t('booking.noSlots')}
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('booking.selectDayPrompt')}
              </Typography>
            )}
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
