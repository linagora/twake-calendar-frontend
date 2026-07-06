import { EventPreviewDetails } from '@/components/EventPreview/EventPreviewDetails'
import { EventPreviewTitleRow } from '@common/components/EventPreview/EventPreviewTitleRow'
import { Loading } from '@common/components/Loading/Loading'
import { CalendarEvent } from '@common/types/EventsTypes'
import React from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import {
  EventLoadError,
  PreviewContainer
} from '../../features/EventPreview/components/EventPreviewShared'
import { useFetchBookedEventDetail } from '../../features/EventPreview/hooks/useFetchBookedEventDetail'

export const BookedEventPreviewPage: React.FC = () => {
  const { t } = useI18n()
  const { bookingConfirmationToken } = useParams<{
    bookingConfirmationToken: string
  }>()

  const { event, loading, error, errorDetail } = useFetchBookedEventDetail(
    bookingConfirmationToken
  )

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
        event={event as CalendarEvent}
        isOwn={false}
        timezone={event?.timezone as string}
        t={t}
      />

      <EventPreviewDetails
        event={event as CalendarEvent}
        isOwn={false}
        isNotPrivate={true}
      />
    </PreviewContainer>
  )
}

export default BookedEventPreviewPage
