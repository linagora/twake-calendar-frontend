import { EventPreviewDetails } from '@/components/EventPreview/EventPreviewDetails'
import { EventPreviewTitleRow } from '@common/components/EventPreview/EventPreviewTitleRow'
import { AttendanceValidation } from './components/AttendanceValidation'
import { Box, useTheme } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { useParseToken } from './hooks/useParseToken'
import { useFetchEventDetail } from './hooks/useFetchEventDetail'
import { Loading } from '@common/components/Loading/Loading'
import { useSearchParams } from 'react-router-dom'
import { fetchEvent } from './EventDao'
import { PreviewContainer } from './components/EventPreviewShared'
import { PublicLoadError } from '@/components/PublicLoadError'
import { CalendarEvent } from '@common/types/EventsTypes'
import { EventStatus } from '@/components/EventPreview/EventStatus'

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

  const detailMessage = React.useMemo(() => {
    return (
      errorDetail ||
      (!decodedClaims ? t('error.invalidOrExpiredToken') : undefined)
    )
  }, [errorDetail, decodedClaims, t])

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
    </PreviewContainer>
  )
}

export default EventPreviewPage
