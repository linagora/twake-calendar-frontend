import { formatEventChipTitle } from '@common/components/Calendar/utils/calendarUtils'
import { ResponsiveDialog } from '@common/components/Dialog'
import { DateTimeFields } from '@common/components/Event/components/DateTimeFields/DateTimeFields'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { splitDateTime } from '@common/components/Event/utils/dateTimeHelpers'
import {
  validateEventForm,
  ValidationResult
} from '@common/components/Event/utils/formValidation'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import { Box, Button, TextField, Typography } from '@linagora/twake-mui'
import moment from 'moment-timezone'
import { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { postCounterProposal } from '@common/features/Events/EventDao'
import { EventTimeSubtitle } from '@common/components/EventPreview/EventTimeSubtitle'
import { ContextualizedEvent } from '@common/types/EventsTypes'
import { makeCounterProposalPayload } from '@common/features/Events/transformers/makeCounterProposalPayload'
import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'

const NO_VALIDATION_ERROR: ValidationResult = {
  isValid: true,
  errors: { date: { start: '', end: '' }, time: { start: '', end: '' } },
  warnings: { date: { start: '' } }
}

export function EventCounterModal({
  open,
  setOpen,
  contextualizedEvent
}: {
  open: boolean
  setOpen: (b: boolean) => void
  contextualizedEvent: ContextualizedEvent
}): JSX.Element {
  const { t } = useI18n()
  const highContrast = useHighContrast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const allday = contextualizedEvent.event.allday ?? false

  const timezone = contextualizedEvent.event.timezone

  const startSplit = splitDateTime(
    moment
      .tz(contextualizedEvent.event.start, timezone)
      .format('YYYY-MM-DDTHH:mm')
  )
  const endSplit = splitDateTime(
    moment
      .tz(
        contextualizedEvent.event.end ?? contextualizedEvent.event.start,
        timezone
      )
      .format('YYYY-MM-DDTHH:mm')
  )

  const [startDate, setStartDate] = useState(startSplit.date)
  const [startTime, setStartTime] = useState(startSplit.time)
  const [endDate, setEndDate] = useState(endSplit.date)
  const [endTime, setEndTime] = useState(endSplit.time)
  const [showMore, setShowMore] = useState(false)
  const [hasEndDateChanged, setHasEndDateChanged] = useState(false)
  const [message, setMessage] = useState('')
  const [validation, setValidation] =
    useState<ValidationResult>(NO_VALIDATION_ERROR)
  const [submitError, setSubmitError] = useState('')

  const clearErrors = (): void => {
    setValidation(NO_VALIDATION_ERROR)
    setSubmitError('')
  }

  const handleStartDateChange = (value: string): void => {
    setStartDate(value)
    if (value > endDate) {
      setEndDate(value)
      setHasEndDateChanged(true)
    }
    clearErrors()
  }

  const handleStartTimeChange = (value: string): void => {
    setStartTime(value)
    clearErrors()
  }

  const handleEndDateChange = (value: string): void => {
    setEndDate(value)
    setHasEndDateChanged(true)
    clearErrors()
  }

  const handleEndTimeChange = (value: string): void => {
    setEndTime(value)
    clearErrors()
  }

  const validate = (): boolean => {
    const result = validateEventForm({
      startDate,
      startTime,
      endDate,
      endTime,
      allday,
      hasEndDateChanged,
      showMore
    })
    setValidation(result)
    setSubmitError('')
    return result.isValid
  }

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return
    if (
      !contextualizedEvent.currentUserAttendee?.cal_address ||
      !contextualizedEvent.event.organizer?.cal_address
    ) {
      setSubmitError(t('error.unknown'))
      return
    }
    setIsSubmitting(true)
    try {
      const counterProposal = makeCounterProposalPayload({
        event: contextualizedEvent.event,
        senderEmail: contextualizedEvent.currentUserAttendee.cal_address,
        recipientEmail: contextualizedEvent.event.organizer.cal_address,
        proposedStart: contextualizedEvent.event.allday
          ? startDate
          : `${startDate}T${startTime}`,
        proposedEnd: contextualizedEvent.event.allday
          ? endDate
          : `${endDate}T${endTime}`,
        message
      })
      await postCounterProposal(contextualizedEvent.event, counterProposal)
      setShowSuccessToast(true)
      setOpen(false)
    } catch (error) {
      console.error(error)
      setSubmitError(t('error.unknown'))
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setStartDate(startSplit.date)
    setStartTime(startSplit.time)
    setEndDate(endSplit.date)
    setEndTime(endSplit.time)
    setShowMore(false)
    setHasEndDateChanged(false)
    setMessage('')
    setValidation(NO_VALIDATION_ERROR)
    setSubmitError('')
  }, [open, startSplit.date, startSplit.time, endSplit.date, endSplit.time])

  return (
    <>
      <SnackbarAlert
        open={showSuccessToast}
        setOpen={setShowSuccessToast}
        message={t('eventPreview.proposalSubmitted')}
      />
      <ResponsiveDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('eventPreview.proposeNewTime')}
        draggable
        actions={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="text" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
            >
              {t('eventPreview.sendProposal')}
            </Button>
          </Box>
        }
      >
        {/* Event title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography
            variant="h3"
            sx={{
              overflowWrap: 'break-word'
            }}
          >
            {formatEventChipTitle(contextualizedEvent.event, t)}
          </Typography>
        </Box>

        {/* Current event time */}

        <EventTimeSubtitle
          event={contextualizedEvent.event}
          timezone={contextualizedEvent.event.timezone}
        />

        {/* Your proposal label */}
        <FieldWithLabel
          label={t('eventPreview.yourProposal')}
          isExpanded={false}
        >
          <DateTimeFields
            startDate={startDate}
            startTime={startTime}
            endDate={endDate}
            endTime={endTime}
            allday={allday}
            showMore={showMore}
            hasEndDateChanged={hasEndDateChanged}
            validation={validation}
            onStartDateChange={handleStartDateChange}
            onStartTimeChange={handleStartTimeChange}
            onEndDateChange={handleEndDateChange}
            onEndTimeChange={handleEndTimeChange}
            showEndDate={
              showMore ||
              allday ||
              (hasEndDateChanged && startDate !== endDate) ||
              (!showMore && !allday && startDate !== endDate)
            }
            onToggleEndDate={() => setShowMore(prev => !prev)}
          />
          {submitError && (
            <Typography
              role="alert"
              variant="caption"
              sx={{ color: 'error.main' }}
            >
              {submitError}
            </Typography>
          )}
        </FieldWithLabel>
        {/* Optional message */}
        <Box sx={{ mt: 2 }}>
          <TextField
            margin="dense"
            multiline
            size="small"
            minRows={2}
            maxRows={10}
            fullWidth
            // R-14, high contrast mode: a label that stays once typing starts
            label={highContrast ? t('eventPreview.optionalMessage') : undefined}
            placeholder={t('eventPreview.optionalMessage')}
            slotProps={{
              htmlInput: { 'aria-label': t('eventPreview.optionalMessage') }
            }}
            value={message}
            onChange={e => setMessage(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiInputBase-root': {
                overflowY: 'auto',
                padding: 0
              },
              '& textarea': {
                resize: 'vertical'
              }
            }}
          />
        </Box>
      </ResponsiveDialog>
    </>
  )
}
