import { EventVideoRow } from '@common/components/EventPreview/EventDetailsRows'
import { BaseEventRow } from '@common/components/EventPreview/EventDetailsRows'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import {
  BookingSlotsResponse,
  Slot
} from '@common/features/booking/types/BookingTypes'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { formatTimezoneLabel } from '@common/utils/timezone'
import {
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
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { BookingOwnerDisplay } from '@/components/Booking/BookingHeader/BookingOwnerInfo'
import { getBookedEvent } from '../BookingDao'

interface BookingSuccessDialogProps {
  open: boolean
  onClose: () => void
  selectedSlot: Slot | null
  bookingInfo: BookingSlotsResponse | null
  eventLink?: string
  bookingConfirmationToken?: string | null
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
  <Box sx={{ position: 'relative', textAlign: 'center', pt: 2 }}>
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
    <Typography variant="body1" sx={{ textAlign: 'center', px: 3, mb: 3 }}>
      {subtitle}
    </Typography>
    <Typography
      variant="body2"
      sx={{ textAlign: 'center', color: 'text.secondary' }}
    >
      {subsubtitle}
    </Typography>
  </>
)

interface SuccessDetailsProps {
  owner?: BookingSlotsResponse['owner']
  durationMinutes?: number
  timeZoneLabel: string
  durationLabel: string
  videoLink?: string
}

const SuccessDetails: React.FC<SuccessDetailsProps> = ({
  owner,
  durationMinutes,
  timeZoneLabel,
  durationLabel,
  videoLink
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
    {owner && <BookingOwnerDisplay owner={owner} />}
    {videoLink && <EventVideoRow meetingLink={videoLink} />}
    {durationMinutes && (
      <BaseEventRow
        icon={<TimerOutlinedIcon />}
        content={<Typography variant="body2">{durationLabel}</Typography>}
      />
    )}
    <BaseEventRow
      icon={<LanguageOutlinedIcon />}
      content={<Typography variant="body2">{timeZoneLabel}</Typography>}
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

export const SuccessFooter: React.FC<SuccessFooterProps> = ({
  onCancelMeeting,
  needChangesLabel,
  cancelLabel,
  suffixLabel
}) => (
  <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5 }}>
      {needChangesLabel}
    </Typography>
    <Typography variant="caption">
      {onCancelMeeting && (
        <Link component="button" onClick={onCancelMeeting}>
          {cancelLabel}
        </Link>
      )}{' '}
      {suffixLabel}
    </Typography>
  </Box>
)

function extractVideoLink(eventJSON: VCalComponent): string | undefined {
  const vevents = (eventJSON[2] ?? []).filter(
    (c): c is VCalComponent =>
      Array.isArray(c) && c[0].toLowerCase() === 'vevent'
  )
  const vevent = vevents[0]
  if (!vevent) return undefined
  const props = vevent[1] as Array<
    [string, Record<string, string>, string, unknown]
  >
  const prop = props.find(
    p => p[0].toLowerCase() === 'x-openpaas-videoconference'
  )
  return typeof prop?.[3] === 'string' ? prop[3] : undefined
}

export const BookingSuccessDialog: React.FC<BookingSuccessDialogProps> = ({
  open,
  onClose,
  selectedSlot,
  bookingInfo,
  eventLink,
  bookingConfirmationToken,
  onCancelMeeting
}) => {
  const { t, lang } = useI18n()

  const owner = bookingInfo?.owner
  const durationMinutes = bookingInfo?.durationMinutes

  const [videoLinkData, setVideoLinkData] = useState<{
    link: string | undefined
    token: string | null | undefined
  }>({ link: undefined, token: null })

  useEffect(() => {
    if (!open || !bookingConfirmationToken) {
      return
    }

    let isMounted = true
    const load = async (): Promise<void> => {
      try {
        const response = await getBookedEvent(bookingConfirmationToken)
        if (isMounted) {
          setVideoLinkData({
            link: extractVideoLink(response.eventJSON),
            token: bookingConfirmationToken
          })
        }
      } catch (err) {
        console.error('Failed to fetch booked event:', err)
      }
    }
    void load()
    return (): void => {
      isMounted = false
    }
  }, [open, bookingConfirmationToken])

  // Only show video link if it matches the current token
  const videoLink =
    videoLinkData.token === bookingConfirmationToken
      ? videoLinkData.link
      : undefined

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
      <DialogContent sx={{ px: 3, pb: 4 }}>
        <SuccessDetails
          owner={owner}
          durationMinutes={durationMinutes}
          timeZoneLabel={timeZoneLabel}
          durationLabel={
            durationMinutes
              ? t('booking.durationMinutes', { count: durationMinutes })
              : ''
          }
          videoLink={videoLink}
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
