import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'
import { isValidEmail } from '@common/utils/isValidEmail'
import { Box, Button, TextField, Typography } from '@linagora/twake-mui'
import React, { RefObject, useId, useRef, useState } from 'react'
import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'
import { useI18n } from 'twake-i18n'
import { BookingOwnerDisplay } from '@/components/Booking/BookingHeader/BookingOwnerInfo'
import { StaticDateTimeSummary } from './StaticDateTimeSummary'
import { ResponsiveDialog } from '@common/components/Dialog'

interface BookingConfirmDialogProps {
  open: boolean
  onClose: () => void
  selectedSlot: Slot | null
  bookingInfo: BookingSlotsResponse | null
  onConfirm: (name: string, email: string) => Promise<void>
  selectedTimezone: string
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
        <Typography component="h3" variant="h4" sx={{ mb: '24px' }}>
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
  nameError: string | null
  emailError: string | null
  bookingError: string | null
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  nameRef: RefObject<HTMLInputElement>
  emailRef: RefObject<HTMLInputElement>
  onEmailBlur: () => void
}

const BookingForm: React.FC<BookingFormProps> = ({
  name,
  email,
  nameError,
  emailError,
  bookingError,
  onNameChange,
  onEmailChange,
  nameRef,
  emailRef,
  onEmailBlur
}) => {
  const { t } = useI18n()
  // R-13, high contrast mode: visible labels (MUI then shows the required
  // asterisk) instead of placeholders that vanish while typing
  const highContrast = useHighContrast()
  return (
    <>
      {highContrast && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {t('a11y.requiredLegend')}
        </Typography>
      )}
      <TextField
        inputRef={nameRef}
        label={highContrast ? t('booking.form.name') : undefined}
        placeholder={highContrast ? undefined : t('booking.form.name')}
        slotProps={{
          htmlInput: {
            'aria-label': t('booking.form.name'),
            autoComplete: 'name'
          }
        }}
        value={name}
        onChange={e => onNameChange(e.target.value)}
        fullWidth
        margin="normal"
        size="small"
        required
        error={!!nameError}
        helperText={nameError}
      />
      <TextField
        inputRef={emailRef}
        label={highContrast ? t('booking.form.email') : undefined}
        placeholder={highContrast ? undefined : t('booking.form.email')}
        onBlur={onEmailBlur}
        slotProps={{
          htmlInput: {
            'aria-label': t('booking.form.email'),
            autoComplete: 'email'
          }
        }}
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
        <Typography role="alert" color="error" variant="body2" sx={{ mt: 1 }}>
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
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [bookingInProgress, setBookingInProgress] = useState<boolean>(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const highContrast = useHighContrast()
  const formId = useId()

  const validateEmail = (value: string): void => {
    if (!isValidEmail(value)) {
      setEmailError(t('peopleSearch.invalidEmail').replace('%{email}', value))
    } else {
      setEmailError(null)
    }
  }

  const handleEmailChange = (value: string): void => {
    setEmail(value)
    // high contrast mode: no error while still typing, checked on leaving
    if (highContrast) {
      if (emailError) setEmailError(null)
      return
    }
    validateEmail(value)
  }

  const handleEmailBlur = (): void => {
    if (highContrast && email) validateEmail(email)
  }

  const handleConfirm = async (): Promise<void> => {
    setNameError(null)
    setEmailError(null)
    setBookingError(null)

    // Each check sends the focus to the field in error, so that its message
    // (linked by aria-describedby) is read out
    if (!name.trim()) {
      setNameError(t('booking.error.nameRequired'))
      nameRef.current?.focus()
      return
    }

    if (!email) {
      setEmailError(t('booking.error.emailRequired'))
      emailRef.current?.focus()
      return
    }

    if (!isValidEmail(email)) {
      setEmailError(t('peopleSearch.invalidEmail').replace('%{email}', email))
      emailRef.current?.focus()
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
    setNameError(null)
    setEmailError(null)
    setName('')
    setEmail('')
  }

  const confirmButtonText = bookingInProgress
    ? t('booking.confirm.inProgress')
    : t('booking.confirm.button')

  const title = bookingInfo?.owner ? (
    <BookingOwnerDisplay owner={bookingInfo.owner} />
  ) : (
    <Box />
  )

  const actions = (
    <>
      <Button onClick={handleClose} variant="text" disabled={bookingInProgress}>
        {t('common.cancel')}
      </Button>
      <Button
        // high contrast mode: a real form, so that Enter submits it too
        {...(highContrast
          ? { type: 'submit' as const, form: formId }
          : { onClick: () => void handleConfirm() })}
        variant="contained"
        disabled={bookingInProgress}
      >
        {confirmButtonText}
      </Button>
    </>
  )

  const bookingForm = (
    <BookingForm
      name={name}
      email={email}
      nameError={nameError}
      emailError={emailError}
      bookingError={bookingError}
      onNameChange={setName}
      onEmailChange={handleEmailChange}
      nameRef={nameRef}
      emailRef={emailRef}
      onEmailBlur={handleEmailBlur}
    />
  )

  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={title}
      ariaLabel={t('booking.confirm.title')}
      actions={actions}
      normalMaxWidth="570px"
      titleSx={{
        my: '16px'
      }}
    >
      <BookingDetails
        bookingInfo={bookingInfo}
        selectedSlot={selectedSlot}
        selectedTimezone={selectedTimezone}
      />
      {highContrast ? (
        <Box
          component="form"
          id={formId}
          noValidate
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault()
            void handleConfirm()
          }}
        >
          {bookingForm}
        </Box>
      ) : (
        bookingForm
      )}
    </ResponsiveDialog>
  )
}
