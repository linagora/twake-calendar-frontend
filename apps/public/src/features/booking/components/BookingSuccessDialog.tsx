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

export const BookingSuccessDialog: React.FC<BookingSuccessDialogProps> = ({
  open,
  onClose,
  selectedSlot,
  bookingInfo,
  eventLink,
  onCancelMeeting
}) => {
  const { t, lang } = useI18n()
  const [linkCopied, setLinkCopied] = useState(false)

  const owner = bookingInfo?.owner
  const durationMinutes = bookingInfo?.durationMinutes

  const slotTime = useMemo(() => {
    if (!selectedSlot) return null
    const startDate = dayjs(selectedSlot.start).locale(lang)
    return {
      date: startDate.format('MMMM D, YYYY'),
      time: startDate.format('HH:mm')
    }
  }, [selectedSlot, lang])

  const timeZoneLabel = formatTimezoneLabel()

  const handleCopyLink = useCallback(async (): Promise<void> => {
    if (!eventLink) return
    try {
      navigator.clipboard.writeText(eventLink)
      setLinkCopied(true)
    } catch (err) {
      console.error('Failed to copy booking link:', err)
    }
  }, [eventLink])

  const showFooter = Boolean(onCancelMeeting)

  return (
    <Dialog open={open} onClose={onClose}>
      {/* Header */}
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
          {t('booking.success.title')}
        </Typography>
      </Box>

      <DialogContent sx={{ px: 3, pb: 4 }}>
        {/* Summary */}
        {slotTime && owner && (
          <>
            <Typography
              variant="body2"
              sx={{ textAlign: 'center', px: 3, mb: 1 }}
            >
              {t('booking.success.subtitle', {
                owner: owner.displayName,
                date: slotTime.date,
                time: slotTime.time
              })}
            </Typography>
            <Typography
              variant="body2"
              sx={{ textAlign: 'center', color: 'text.secondary', mb: 3 }}
            >
              {t('booking.success.subsubtitle')}
            </Typography>
          </>
        )}

        {/* Details */}
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
              content={
                <Typography variant="body1">{owner.displayName}</Typography>
              }
            />
          )}
          {durationMinutes && (
            <BaseEventRow
              icon={<TimerOutlinedIcon />}
              content={
                <Typography variant="body1">
                  {t('booking.durationMinutes', { count: durationMinutes })}
                </Typography>
              }
            />
          )}
          <BaseEventRow
            icon={<LanguageOutlinedIcon />}
            content={<Typography variant="body1">{timeZoneLabel}</Typography>}
          />
        </Box>

        {/* Copy link */}
        {eventLink && (
          <>
            <Button
              onClick={() => void handleCopyLink()}
              variant="outlined"
              fullWidth
              startIcon={<LinkIcon fontSize="small" />}
              sx={{ mb: 3 }}
            >
              {t('booking.success.copyLink')}
            </Button>
            <SnackbarAlert
              setOpen={setLinkCopied}
              open={linkCopied}
              message={t('common.link_copied')}
            />
          </>
        )}

        {/* Footer actions */}
        {showFooter && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mb: 0.5 }}
            >
              {t('booking.success.needChanges')}
            </Typography>
            <Typography variant="body2">
              {onCancelMeeting && (
                <Link component="button" onClick={onCancelMeeting}>
                  {t('booking.success.cancelMeeting')}
                </Link>
              )}{' '}
              {t('booking.success.yourMeetingSuffix')}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
