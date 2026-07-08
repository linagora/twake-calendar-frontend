import { EventPreviewDetails } from '@/components/EventPreview/EventPreviewDetails'
import { SuccessFooter } from '@/features/booking/components/BookingSuccessDialog'
import { useFilterEventAttendees } from '@common/components/Event/hooks/useFilterEventAttendees'
import { EventPreviewTitleRow } from '@common/components/EventPreview/EventPreviewTitleRow'
import { Loading } from '@common/components/Loading/Loading'
import { Box, Typography } from '@linagora/twake-mui'
import React from 'react'
import { useParams } from 'react-router-dom'
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

  const { event, loading, error, errorDetail, refetch } =
    useFetchBookedEventDetail(bookingConfirmationToken)

  const { organizer } = useFilterEventAttendees({ event: event || {} })
  const organizerPartstat = organizer?.partstat

  const handleCancelMeeting = async (): Promise<void> => {
    if (!bookingConfirmationToken) return
    try {
      await cancelBookedEvent(bookingConfirmationToken)
      void refetch()
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
      <EventPreviewTitleRow
        event={event}
        isOwn={false}
        timezone={event?.timezone}
        t={t}
      />

      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {organizerPartstat
            ? t(`booking.organizerStatus.${organizerPartstat}`)
            : t('booking.organizerStatus.WAITING')}
        </Typography>
      </Box>

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
