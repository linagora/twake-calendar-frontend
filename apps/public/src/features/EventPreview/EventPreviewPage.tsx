import { EventPreviewDetails } from '@/components/EventPreview/EventPreviewDetails'
import { EventPreviewTitleRow } from '@common/components/EventPreview/EventPreviewTitleRow'
import { AttendanceValidation } from './components/AttendanceValidation'
import { Box, Typography, useTheme } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { useParseToken } from './hooks/useParseToken'
import { useFetchEventDetail } from './hooks/useFetchEventDetail'
import { Loading } from '@common/components/Loading/Loading'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useSearchParams } from 'react-router-dom'
import { fetchEvent } from './EventDao'

const isUnableToLoad = (
  error: boolean,
  event: CalendarEvent | undefined,
  decodedClaims: unknown
): boolean => {
  return error || !event || !decodedClaims
}

interface EventLoadErrorProps {
  errorDetail: string | undefined
  hasDecodedClaims: boolean
  t: (key: string) => string
}

const EventLoadError: React.FC<EventLoadErrorProps> = ({
  errorDetail,
  hasDecodedClaims,
  t
}) => {
  const detailMessage =
    errorDetail ||
    (!hasDecodedClaims ? t('error.invalidOrExpiredToken') : undefined)

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography color="error" variant="h5">
        {t('error.cannotLoadEvent')}
      </Typography>
      {detailMessage && (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          {detailMessage}
        </Typography>
      )}
    </Box>
  )
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

  const handleRsvpChoice = async (url: string): Promise<void> => {
    try {
      const urlObj = new URL(url)
      const newJwt = urlObj.searchParams.get('jwt')
      if (newJwt) {
        await fetchEvent(newJwt)
        setSearchParams({ jwt: newJwt })
      }
    } catch (e) {
      console.error('Failed to process RSVP choice:', e)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (isUnableToLoad(error, event, decodedClaims)) {
    return (
      <EventLoadError
        errorDetail={errorDetail}
        hasDecodedClaims={!!decodedClaims}
        t={t}
      />
    )
  }

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        padding: { xs: '24px', sm: '32px' },
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
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
    </Box>
  )
}

export default EventPreviewPage
