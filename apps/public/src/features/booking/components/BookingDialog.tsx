import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'
import { isValidEmail } from '@common/utils/isValidEmail'
import {
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
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { BookingOwnerDisplay } from '@/components/Booking/BookingHeader/BookingOwnerInfo'
import { StaticDateTimeSummary } from './StaticDateTimeSummary'

interface BookingConfirmDialogProps {
  open: boolean
  onClose: () => void
  selectedSlot: Slot | null
  bookingInfo: BookingSlotsResponse | null
  onConfirm: (name: string, email: string) => Promise<void>
  selectedTimezone: string
}

interface DialogHeaderProps {
  owner: BookingSlotsResponse['owner'] | undefined
  onClose: () => void
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ owner, onClose }) => {
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
      {owner ? <BookingOwnerDisplay owner={owner} /> : <Box />}
      <IconButton onClick={onClose} size="small">
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
  )
}

interface BookingDetailsProps {
  bookingInfo: BookingSlotsResponse | null
  selectedSlot: Slot | null
  selectedTimezone: string
}

const BookingDetails: React.FC<BookingDetailsProps> = ({
  bookingInfo,
  selectedSlot,
  selectedTimezone
}) => {
  let startDateStr = ''
  let startTimeStr = ''
  let endDateStr = ''
  let endTimeStr = ''

  if (selectedSlot) {
    const start = new Date(selectedSlot.start)
    const end = new Date(
      start.getTime() + (bookingInfo?.durationMinutes ?? 30) * 60000
    )

    const dateFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: selectedTimezone
    })
    const timeFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: selectedTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    startDateStr = dateFmt.format(start)
    startTimeStr = timeFmt.format(start)
    endDateStr = dateFmt.format(end)
    endTimeStr = timeFmt.format(end)
  }

  return (
    <>
      {bookingInfo?.name && (
        <Typography variant="h4" sx={{ mb: '24px' }}>
          {bookingInfo.name}
        </Typography>
      )}
      {selectedSlot && (
        <StaticDateTimeSummary
          startDate={startDateStr}
          startTime={startTimeStr}
          endDate={endDateStr}
          endTime={endTimeStr}
          timezone={selectedTimezone}
        />
      )}
    </>
  )
}

interface BookingFormProps {
  name: string
  email: string
  emailError: string | null
  bookingError: string | null
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
}

const BookingForm: React.FC<BookingFormProps> = ({
  name,
  email,
  emailError,
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
        error={!!emailError}
        helperText={emailError}
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
  onConfirm,
  selectedTimezone
}) => {
  const { t } = useI18n()
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [bookingInProgress, setBookingInProgress] = useState<boolean>(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const handleConfirm = async (): Promise<void> => {
    setEmailError(null)
    setBookingError(null)

    if (!email) {
      setEmailError(t('booking.error.emailRequired'))
      return
    }

    if (!isValidEmail(email)) {
      setEmailError(t('peopleSearch.invalidEmail').replace('%{email}', email))
      return
    }

    setBookingInProgress(true)
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
    setEmailError(null)
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
        <BookingDetails
          bookingInfo={bookingInfo}
          selectedSlot={selectedSlot}
          selectedTimezone={selectedTimezone}
        />
        <BookingForm
          name={name}
          email={email}
          emailError={emailError}
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
          onClick={() => void handleConfirm()}
          variant="contained"
          disabled={bookingInProgress}
        >
          {confirmButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
