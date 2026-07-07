import { stringAvatar } from '@common/components/Event/utils/eventUtils'
import { BaseEventRow } from '@common/components/EventPreview/EventDetailsRows'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'
import { formatTimezoneLabel } from '@common/utils/timezone'
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Link,
  Typography
} from '@linagora/twake-mui'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CloseIcon from '@mui/icons-material/Close'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import LinkIcon from '@mui/icons-material/Link'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import dayjs from 'dayjs'
import React, { useCallback, useMemo, useState } from 'react'
import { useI18n } from 'twake-i18n'

interface BookingSuccessDialogProps {
  open: boolean
  onClose: () => void
  selectedSlot: Slot | null
  bookingInfo: BookingSlotsResponse | null
  eventLink?: string
  onCancelMeeting?: () => void
}

interface SlotTime {
  date: string
  time: string
}

interface SuccessHeaderProps {
  onClose: () => void
  title: string
}

const SuccessHeader: React.FC<SuccessHeaderProps> = ({ onClose, title }) => (
  <Box sx={{ position: 'relative', textAlign: 'center', pt: 4, pb: 1 }}>
    <IconButton
      onClick={onClose}
      size="small"
      sx={{ position: 'absolute', top: 8, right: 8 }}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
    <CheckCircleOutlinedIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
    <Typography variant="h3" sx={{ mb: 1 }}>
      {title}
    </Typography>
  </Box>
)

interface SuccessSummaryProps {
  subtitle: string
  subsubtitle: string
}

const SuccessSummary: React.FC<SuccessSummaryProps> = ({
  subtitle,
  subsubtitle
}) => (
  <>
    <Typography variant="body2" sx={{ textAlign: 'center', px: 3, mb: 1 }}>
      {subtitle}
    </Typography>
    <Typography
      variant="body2"
      sx={{ textAlign: 'center', color: 'text.secondary', mb: 3 }}
    >
      {subsubtitle}
    </Typography>
  </>
)

interface SuccessDetailsProps {
  owner?: { displayName: string }
  durationMinutes?: number
  timeZoneLabel: string
  durationLabel: string
}

const SuccessDetails: React.FC<SuccessDetailsProps> = ({
  owner,
  durationMinutes,
  timeZoneLabel,
  durationLabel
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      borderTop: 1,
      borderColor: 'divider',
      p: 3,
      gap: 1
    }}
  >
    {owner && (
      <BaseEventRow
        icon={<Avatar {...stringAvatar(owner.displayName)} />}
        content={<Typography variant="body1">{owner.displayName}</Typography>}
      />
    )}
    {durationMinutes && (
      <BaseEventRow
        icon={<TimerOutlinedIcon />}
        content={<Typography variant="body1">{durationLabel}</Typography>}
      />
    )}
    <BaseEventRow
      icon={<LanguageOutlinedIcon />}
      content={<Typography variant="body1">{timeZoneLabel}</Typography>}
    />
  </Box>
)

interface CopyLinkSectionProps {
  eventLink: string
  copyLabel: string
  copiedMessage: string
}

const CopyLinkSection: React.FC<CopyLinkSectionProps> = ({
  eventLink,
  copyLabel,
  copiedMessage
}) => {
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopyLink = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(eventLink)
      setLinkCopied(true)
    } catch (err) {
      console.error('Failed to copy booking link:', err)
    }
  }, [eventLink])

  return (
    <>
      <Button
        onClick={() => void handleCopyLink()}
        variant="outlined"
        fullWidth
        startIcon={<LinkIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        {copyLabel}
      </Button>
      <SnackbarAlert
        setOpen={setLinkCopied}
        open={linkCopied}
        message={copiedMessage}
      />
    </>
  )
}

interface SuccessFooterProps {
  onCancelMeeting?: () => void
  needChangesLabel: string
  cancelLabel: string
  suffixLabel: string
}

const SuccessFooter: React.FC<SuccessFooterProps> = ({
  onCancelMeeting,
  needChangesLabel,
  cancelLabel,
  suffixLabel
}) => (
  <Box sx={{ textAlign: 'center' }}>
    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
      {needChangesLabel}
    </Typography>
    <Typography variant="body2">
      {onCancelMeeting && (
        <Link component="button" onClick={onCancelMeeting}>
          {cancelLabel}
        </Link>
      )}{' '}
      {suffixLabel}
    </Typography>
  </Box>
)

export const BookingSuccessDialog: React.FC<BookingSuccessDialogProps> = ({
  open,
  onClose,
  selectedSlot,
  bookingInfo,
  eventLink,
  onCancelMeeting
}) => {
  const { t, lang } = useI18n()

  const owner = bookingInfo?.owner
  const durationMinutes = bookingInfo?.durationMinutes

  const slotTime = useMemo<SlotTime | null>(() => {
    if (!selectedSlot) return null
    const startDate = dayjs(selectedSlot.start).locale(lang)
    return {
      date: startDate.format('MMMM D, YYYY'),
      time: startDate.format('HH:mm')
    }
  }, [selectedSlot, lang])

  const timeZoneLabel = formatTimezoneLabel()
  const showFooter = Boolean(onCancelMeeting)

  return (
    <Dialog open={open} onClose={onClose}>
      <SuccessHeader onClose={onClose} title={t('booking.success.title')} />

      <DialogContent sx={{ px: 3, pb: 4 }}>
        {slotTime && owner && (
          <SuccessSummary
            subtitle={t('booking.success.subtitle', {
              owner: owner.displayName,
              date: slotTime.date,
              time: slotTime.time
            })}
            subsubtitle={t('booking.success.subsubtitle')}
          />
        )}

        <SuccessDetails
          owner={owner}
          durationMinutes={durationMinutes}
          timeZoneLabel={timeZoneLabel}
          durationLabel={
            durationMinutes
              ? t('booking.durationMinutes', { count: durationMinutes })
              : ''
          }
        />

        {eventLink && (
          <CopyLinkSection
            eventLink={eventLink}
            copyLabel={t('booking.success.copyLink')}
            copiedMessage={t('common.link_copied')}
          />
        )}

        {showFooter && (
          <SuccessFooter
            onCancelMeeting={onCancelMeeting}
            needChangesLabel={t('booking.success.needChanges')}
            cancelLabel={t('booking.success.cancelMeeting')}
            suffixLabel={t('booking.success.yourMeetingSuffix')}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
