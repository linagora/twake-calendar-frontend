import { EventPreviewDetails } from '@/components/EventPreview/EventPreviewDetails'
import { EventStatus } from '@/components/EventPreview/EventStatus'
import { SuccessFooter } from '@/features/booking/components/BookingSuccessDialog'
import { useFilterEventAttendees } from '@common/components/Event/hooks/useFilterEventAttendees'
import { EventPreviewTitleRow } from '@common/components/EventPreview/EventPreviewTitleRow'
import { Loading } from '@common/components/Loading/Loading'
import { TimezoneSelector } from '@common/components/Timezone/TimezoneSelector'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { Box } from '@linagora/twake-mui'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import React, { useState } from 'react'
import { useParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import {
  EventLoadError,
  PreviewContainer
} from '../../features/EventPreview/components/EventPreviewShared'
import { useFetchBookedEventDetail } from '../../features/EventPreview/hooks/useFetchBookedEventDetail'
import { cancelBookedEvent } from '../../features/booking/BookingDao'

export const BookedEventPreviewPage: React.FC = () => {
  const { t } = useI18n()
  const { bookingConfirmationToken } = useParams<{
    bookingConfirmationToken: string
  }>()

  const { event, loading, error, errorDetail } = useFetchBookedEventDetail(
    bookingConfirmationToken
  )
  // The booking backend stores the event in UTC: show it in the visitor's zone
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    browserDefaultTimeZone
  )

  const { organizer } = useFilterEventAttendees({
    event: event || {
      URL: '',
      calId: '',
      uid: '',
      start: '',
      timezone: 'UTC',
      attendee: []
    }
  })
  const organizerPartstat = organizer?.partstat

  const handleCancelMeeting = async (): Promise<void> => {
    if (!bookingConfirmationToken) return
    try {
      await cancelBookedEvent(bookingConfirmationToken)
      const base = window.PUBLIC_PAGE_BASE ?? window.location.origin
      const linkId = event?.bookingLinkPublicId
      window.location.href = linkId
        ? `${base}/booking/${linkId}?cancelled=true`
        : base
    } catch (err) {
      console.error('Failed to cancel meeting:', err)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (error || !event) {
    return (
      <PreviewContainer>
        <EventLoadError errorDetail={errorDetail} />
      </PreviewContainer>
    )
  }

  return (
    <PreviewContainer>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px'
        }}
      >
        <LanguageOutlinedIcon sx={{ color: 'text.secondary' }} />
        <TimezoneSelector
          value={selectedTimezone}
          onChange={setSelectedTimezone}
          referenceDate={new Date(event.start)}
        />
      </Box>
      <EventPreviewTitleRow
        event={event}
        isOwn={false}
        timezone={selectedTimezone}
        t={t}
      />
      <EventStatus partStat={organizerPartstat} isOrganizer />
      <EventPreviewDetails event={event} isOwn={false} isNotPrivate={true} />
      <SuccessFooter
        onCancelMeeting={handleCancelMeeting}
        needChangesLabel={t('booking.success.needChanges')}
        cancelLabel={t('booking.success.cancelMeeting')}
        suffixLabel={t('booking.success.yourMeetingSuffix')}
      />
    </PreviewContainer>
  )
}

export default BookedEventPreviewPage
