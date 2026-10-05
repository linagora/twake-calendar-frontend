import { EventPreviewDetails } from '@/components/EventPreview/EventPreviewDetails'
import { EventPreviewTitleRow } from '@common/components/EventPreview/EventPreviewTitleRow'
import { AttendanceValidation } from './components/AttendanceValidation'
import { Box, useTheme } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { useParseToken } from './hooks/useParseToken'
import { useFetchEventDetail } from './hooks/useFetchEventDetail'
import { Loading } from '@common/components/Loading/Loading'
import { useSearchParams } from 'react-router'
import { PreviewContainer } from './components/EventPreviewShared'
import { PublicLoadError } from '@/components/PublicLoadError'
import { CalendarEvent } from '@common/types/EventsTypes'
import { EventStatus } from '@/components/EventPreview/EventStatus'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import { useRsvpAction } from './hooks/useRsvpAction'
import React, { useMemo } from 'react'

const isUnableToLoad = (
  error: boolean,
  event: CalendarEvent | undefined,
  decodedClaims: unknown
): boolean => {
  return error || !event || !decodedClaims
}

export const EventPreviewPage: React.FC = () => {
  const { t } = useI18n()
  const theme = useTheme()
  const [, setSearchParams] = useSearchParams()

  const decodedClaims = useParseToken()
  const { jwt = '', calId = '', action = undefined } = decodedClaims || {}

  const { event, links, loading, error, errorDetail } = useFetchEventDetail(
    jwt,
    calId
  )

  const { toastOpen, setToastOpen, handleRsvpChoice } = useRsvpAction(
    action,
    event,
    setSearchParams
  )

  const detailMessage = useMemo(() => {
    return (
      errorDetail ||
      (!decodedClaims ? t('error.invalidOrExpiredToken') : undefined)
    )
  }, [errorDetail, decodedClaims, t])

  useDocumentTitle(
    loading
      ? undefined
      : isUnableToLoad(error, event, decodedClaims)
        ? t('error.cannotLoadEvent')
        : event?.title
  )

  if (loading) {
    return <Loading />
  }

  if (isUnableToLoad(error, event, decodedClaims)) {
    return (
      <PreviewContainer>
        <PublicLoadError
          title={t('error.cannotLoadEvent')}
          detailMessage={detailMessage}
        />
      </PreviewContainer>
    )
  }

  return (
    <PreviewContainer>
      <EventPreviewTitleRow
        event={event as CalendarEvent}
        titleComponent="h1"
        isOwn={false}
        timezone={event?.timezone as string}
        t={t}
      />
      <EventStatus partStat={action} />
      <EventPreviewDetails
        event={event as CalendarEvent}
        isOwn={false}
        isNotPrivate={true}
      />

      <Box
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          pt: '24px',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <AttendanceValidation
          links={links}
          currentUserPartstat={action}
          onChoice={handleRsvpChoice}
        />
      </Box>
      <SnackbarAlert
        open={toastOpen}
        setOpen={setToastOpen}
        message={t('eventPreview.replySentTo', {
          organizerName: event?.organizer?.cn
        })}
      />
    </PreviewContainer>
  )
}

export default EventPreviewPage
