import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'
import { DateTimeSummarySection } from '@common/components/Event/components/DateTimeFields/DateTimeSubPanels'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from '@linagora/twake-mui'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { browserDefaultTimeZone } from '@common/utils/timezone'

interface BookingConfirmDialogProps {
  open: boolean
  onClose: () => void
  selectedSlot: Slot | null
  bookingInfo: BookingSlotsResponse | null
  onConfirm: (name: string, email: string) => Promise<void>
}

export const BookingConfirmDialog: React.FC<BookingConfirmDialogProps> = ({
  open,
  onClose,
  selectedSlot,
  bookingInfo,
  onConfirm
}) => {
  const { t } = useI18n()
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [bookingInProgress, setBookingInProgress] = useState<boolean>(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const handleConfirm = async (): Promise<void> => {
    if (!email) {
      setBookingError(t('booking.error.emailRequired'))
      return
    }
    setBookingInProgress(true)
    setBookingError(null)
    try {
      await onConfirm(name, email)
      setName('')
      setEmail('')
    } catch {
      setBookingError(t('booking.error.createFailed'))
    } finally {
      setBookingInProgress(false)
    }
  }

  const handleClose = (): void => {
    onClose()
    setBookingError(null)
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t('booking.confirm.title')}</DialogTitle>
      <DialogContent>
        {selectedSlot && (
          <DateTimeSummarySection
            startDate={dayjs(selectedSlot.start).format('YYYY-MM-DD')}
            startTime={dayjs(selectedSlot.start).format('HH:mm')}
            endDate={dayjs(selectedSlot.start)
              .add(bookingInfo?.durationMinutes ?? 30, 'minute')
              .format('YYYY-MM-DD')}
            endTime={dayjs(selectedSlot.start)
              .add(bookingInfo?.durationMinutes ?? 30, 'minute')
              .format('HH:mm')}
            allday={false}
            timezone={browserDefaultTimeZone}
            repetition={{ freq: '' }}
            hasEndDateChanged={false}
            onExpand={() => {}}
          />
        )}
        <TextField
          label={t('booking.form.name')}
          placeholder={t('booking.form.namePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
          margin="normal"
          size="small"
        />
        <TextField
          label={t('booking.form.email')}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          required
        />
        {bookingError && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {bookingError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="text">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={bookingInProgress}
        >
          {bookingInProgress
            ? t('booking.confirm.inProgress')
            : t('booking.confirm.button')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
