import { DateTimeSummary } from '@common/components/Event/components/DateTimeSummary'
import { stringAvatar } from '@common/components/Event/utils/eventUtils'
import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography
} from '@linagora/twake-mui'
import CloseIcon from '@mui/icons-material/Close'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'

interface BookingConfirmDialogProps {
  open: boolean
  onClose: () => void
  selectedSlot: Slot | null
  bookingInfo: BookingSlotsResponse | null
  onConfirm: (name: string, email: string) => Promise<void>
}

interface DialogHeaderProps {
  owner: BookingSlotsResponse['owner'] | undefined
  onClose: () => void
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ owner, onClose }) => {
  const { t } = useI18n()
  return (
    <DialogTitle
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4px',
        my: '16px'
      }}
    >
      {owner ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Avatar {...stringAvatar(owner.displayName)} />
          <Typography variant="body2">{owner.displayName}</Typography>
        </Box>
      ) : (
        <Box />
      )}
      <IconButton onClick={onClose} size="small" aria-label={t('common.close')}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
  )
}

interface BookingDetailsProps {
  bookingInfo: BookingSlotsResponse | null
  selectedSlot: Slot | null
}

const BookingDetails: React.FC<BookingDetailsProps> = ({
  bookingInfo,
  selectedSlot
}) => {
  const endDateTime = selectedSlot
    ? dayjs(selectedSlot.start).add(
        bookingInfo?.durationMinutes ?? 30,
        'minute'
      )
    : null

  return (
    <>
      {bookingInfo?.name && (
        <Typography variant="h4" sx={{ mb: '24px' }}>
          {bookingInfo.name}
        </Typography>
      )}
      {selectedSlot && endDateTime && (
        <DateTimeSummary
          startDate={dayjs(selectedSlot.start).format('YYYY-MM-DD')}
          startTime={dayjs(selectedSlot.start).format('HH:mm')}
          endDate={endDateTime.format('YYYY-MM-DD')}
          endTime={endDateTime.format('HH:mm')}
          allday={false}
          timezone={browserDefaultTimeZone}
          repetition={{ freq: '' }}
          showEndDate={false}
          onClick={() => {}}
          hideRepeatInfo
        />
      )}
    </>
  )
}

interface BookingFormProps {
  name: string
  email: string
  bookingError: string | null
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
}

const BookingForm: React.FC<BookingFormProps> = ({
  name,
  email,
  bookingError,
  onNameChange,
  onEmailChange
}) => {
  const { t } = useI18n()
  return (
    <>
      <TextField
        placeholder={t('booking.form.name')}
        value={name}
        onChange={e => onNameChange(e.target.value)}
        fullWidth
        margin="normal"
        size="small"
      />
      <TextField
        placeholder={t('booking.form.email')}
        type="email"
        value={email}
        onChange={e => onEmailChange(e.target.value)}
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
    </>
  )
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
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined
      setBookingError(message || t('booking.error.createFailed'))
    } finally {
      setBookingInProgress(false)
    }
  }

  const handleClose = (): void => {
    if (bookingInProgress) {
      return
    }
    onClose()
    setBookingError(null)
    setName('')
    setEmail('')
  }

  const confirmButtonText = bookingInProgress
    ? t('booking.confirm.inProgress')
    : t('booking.confirm.button')

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogHeader owner={bookingInfo?.owner} onClose={handleClose} />
      <DialogContent>
        <BookingDetails bookingInfo={bookingInfo} selectedSlot={selectedSlot} />
        <BookingForm
          name={name}
          email={email}
          bookingError={bookingError}
          onNameChange={setName}
          onEmailChange={setEmail}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          variant="text"
          disabled={bookingInProgress}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={bookingInProgress}
        >
          {confirmButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
