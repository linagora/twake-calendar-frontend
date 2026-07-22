import { BookingHeader } from '@/components/Booking/BookingHeader'
import { Slot } from '@common/features/booking/types/BookingTypes'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import { Box, CircularProgress, Divider } from '@linagora/twake-mui'
import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { cancelBookedEvent, createBooking } from './BookingDao'
import dayjs, { Dayjs } from 'dayjs'
import { HTTPError } from 'ky'
import { BookingCalendarSection } from '../../components/Booking/BookingCalendarSection'
import { BookingConfirmDialog } from './components/BookingDialog'
import { BookingSuccessDialog } from './components/BookingSuccessDialog'
import { BookingTimeSlotSection } from '../../components/Booking/BookingTimeSlotSection'
import { useI18n } from 'twake-i18n'
import { useBookingData } from './hooks/useBookingData'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { BookingErrorBoundary } from './components/BookingErrorBoundary'

export const BookingPage: React.FC = () => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const { bookingLinkPublicId } = useParams<{
    bookingLinkPublicId: string
  }>()

  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    browserDefaultTimeZone
  )
  const { slots, bookingInfo, initialLoading, monthLoading, error, refetch } =
    useBookingData({
      bookingLinkPublicId,
      visibleMonth,
      timezone: selectedTimezone,
      loadErrorMessage: t('booking.error.loadFailed')
    })

  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false)
  const [successOpen, setSuccessOpen] = useState<boolean>(false)
  const [bookingConfirmationToken, setBookingConfirmationToken] = useState<
    string | null
  >(null)
  const [cancelToastOpen, setCancelToastOpen] = useState<boolean>(
    searchParams.get('cancelled') === 'true'
  )
  const [nowMs] = useState(Date.now)
  const [submitError, setSubmitError] = useState<number | string | null>(null)

  const tzFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-CA', { timeZone: selectedTimezone }),
    [selectedTimezone]
  )

  // Group slots by calendar day for quick lookup when rendering the grid
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>()
    slots.forEach(slot => {
      if (new Date(slot.start).getTime() < nowMs) {
        return
      }
      const key = tzFormatter.format(new Date(slot.start))
      const existing = map.get(key) ?? []
      existing.push(slot)
      map.set(key, existing)
    })
    return map
  }, [slots, tzFormatter, nowMs])

  const availableDays = useMemo(() => new Set(slotsByDay.keys()), [slotsByDay])

  // Compute effective selected day - use default if user hasn't selected yet
  const effectiveSelectedDay = useMemo<Dayjs | null>(() => {
    // If user has already selected a day, use that
    if (selectedDay !== null) {
      return selectedDay
    }
    // Otherwise, default to today or first available day
    if (availableDays.size === 0) {
      return null
    }
    const today = dayjs().tz(selectedTimezone).format('YYYY-MM-DD')
    if (availableDays.has(today)) {
      return dayjs()
    }
    const earliestDay = Array.from(availableDays).sort().at(0)
    return earliestDay ? dayjs(earliestDay) : null
  }, [availableDays, selectedDay])

  const slotsForSelectedDay = useMemo<Slot[]>(() => {
    if (!effectiveSelectedDay) {
      return []
    }
    return slotsByDay.get(effectiveSelectedDay.format('YYYY-MM-DD')) ?? []
  }, [effectiveSelectedDay, slotsByDay])

  const handleMonthChange = (month: Dayjs): void => {
    setVisibleMonth(new Date(month.year(), month.month(), 1))
    setSelectedDay(null)
    setSelectedSlot(null)
    setSubmitError(null)
  }

  const handleSelectDay = (date: Dayjs | null): void => {
    setSelectedDay(date)
    setSelectedSlot(null)
    setSubmitError(null)
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
    if (!bookingLinkPublicId || !selectedSlot) return

    try {
      const response = await createBooking(bookingLinkPublicId, {
        startUtc: selectedSlot.start,
        creator: {
          name: name || undefined,
          email
        },
        eventTitle: bookingInfo?.name || t('booking.defaultEventTitle'),
        visioLink: true
      })
      refetch()
      setConfirmOpen(false)
      setBookingConfirmationToken(response.bookingConfirmationToken)
      setSuccessOpen(true)
    } catch (err: unknown) {
      if (err instanceof HTTPError) {
        setSubmitError(err.response.status)
      } else {
        setSubmitError(t('booking.error.submitFailed'))
      }
      setConfirmOpen(false)
    }
  }

  const handleCloseSuccess = (): void => {
    setSuccessOpen(false)
    setSelectedSlot(null)
  }

  const handleCancelMeeting = async (): Promise<void> => {
    if (!bookingConfirmationToken) return
    try {
      await cancelBookedEvent(bookingConfirmationToken)
      setBookingConfirmationToken(null)
      refetch()
      setSuccessOpen(false)
      setSelectedSlot(null)
      setCancelToastOpen(true)
      // Remove cancelled param from URL if present
      if (searchParams.get('cancelled')) {
        searchParams.delete('cancelled')
        setSearchParams(searchParams)
      }
    } catch (err) {
      console.error('Failed to cancel meeting:', err)
    }
  }

  const handleTimezoneChange = (timezone: string): void => {
    setSelectedTimezone(timezone)
    setSelectedDay(null)
    setSelectedSlot(null)
  }

  const errorStatus = submitError || error

  return (
    <BookingErrorBoundary
      errorStatus={errorStatus}
      initialLoading={initialLoading}
      hasBookingInfo={Boolean(bookingInfo)}
    >
      {nonBlockingErrorNode => (
        <>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '900px',
              display: 'flex',
              height: '100%',
              flexDirection: 'column'
            }}
          >
            {initialLoading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '32px 0'
                }}
              >
                <CircularProgress size={28} />
              </Box>
            ) : (
              <>
                {bookingInfo && (
                  <BookingHeader
                    bookingInfo={bookingInfo}
                    selectedTimezone={selectedTimezone}
                    onTimezoneChange={handleTimezoneChange}
                    referenceDate={visibleMonth}
                  />
                )}
                {!isMobile && <Divider />}

                <Box sx={{ position: 'relative' }}>
                  {nonBlockingErrorNode}

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
                      selectedDay={effectiveSelectedDay}
                      availableDays={availableDays}
                      onSelectDay={handleSelectDay}
                      onMonthChange={handleMonthChange}
                      selectedTimezone={selectedTimezone}
                    />
                    {isMobile && <Divider />}
                    <BookingTimeSlotSection
                      selectedDay={effectiveSelectedDay}
                      slots={slotsForSelectedDay}
                      selectedSlot={selectedSlot}
                      onSelectSlot={handleSelectSlot}
                      selectedTimezone={selectedTimezone}
                    />
                  </Box>
                </Box>
              </>
            )}

            <BookingConfirmDialog
              open={confirmOpen}
              onClose={handleCloseConfirm}
              selectedSlot={selectedSlot}
              bookingInfo={bookingInfo}
              onConfirm={handleConfirmBooking}
              selectedTimezone={selectedTimezone}
            />
            <BookingSuccessDialog
              open={successOpen}
              onClose={handleCloseSuccess}
              selectedSlot={selectedSlot}
              bookingInfo={bookingInfo}
              eventLink={`${window.location.origin}/booking/confirmed/${bookingConfirmationToken}`}
              bookingConfirmationToken={bookingConfirmationToken}
              onCancelMeeting={() => void handleCancelMeeting()}
            />
          </Box>
          <SnackbarAlert
            open={cancelToastOpen}
            setOpen={setCancelToastOpen}
            message={t('booking.cancelSuccess')}
          />
        </>
      )}
    </BookingErrorBoundary>
  )
}

export default BookingPage
