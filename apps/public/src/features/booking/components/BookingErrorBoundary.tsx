import { Box, Button, Typography } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { PublicLoadError } from '@/components/PublicLoadError'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'

export interface BookingErrorBoundaryProps {
  errorStatus: string | number | null
  initialLoading?: boolean
  hasBookingInfo?: boolean
  children?: (nonBlockingErrorNode: React.ReactNode) => React.ReactNode
}

const isBlockingError = (
  errorStatus: string | number | null,
  hasBookingInfo: boolean
) => {
  if (!errorStatus) return false
  if (
    typeof errorStatus === 'number' &&
    [400, 403, 404, 422].includes(errorStatus)
  ) {
    return true
  }
  return !hasBookingInfo
}

interface ErrorDetails {
  title: string
  detailMessage?: string
  action?: React.ReactNode
}

const getErrorDetails = (
  errorStatus: string | number | null,
  t: ReturnType<typeof useI18n>['t']
): ErrorDetails => {
  if (typeof errorStatus === 'string') {
    return { title: errorStatus }
  }

  switch (errorStatus) {
    case 404:
      return { title: t('booking.error.notFound') }
    case 400:
      return { title: t('booking.error.notAvailable') }
    case 403:
      return { title: t('booking.error.ownerNoRights') }
    case 422:
      return {
        title: t('booking.error.noLongerAvailable'),
        detailMessage: t('booking.error.refreshPage'),
        action: (
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
          >
            {t('booking.error.refresh')}
          </Button>
        )
      }
    default:
      return { title: t('booking.error.loadFailed') }
  }
}

export const BookingErrorBoundary: React.FC<BookingErrorBoundaryProps> = ({
  errorStatus,
  initialLoading = false,
  hasBookingInfo = true,
  children
}) => {
  const { t } = useI18n()

  const isBlocking =
    !initialLoading && isBlockingError(errorStatus, hasBookingInfo)

  if (isBlocking) {
    const { title, detailMessage, action } = getErrorDetails(errorStatus, t)

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
        <PublicLoadError
          title={title}
          detailMessage={detailMessage}
          action={action}
        />
      </Box>
    )
  }

  const nonBlockingErrorNode =
    errorStatus && !initialLoading ? (
      <Typography color="error" variant="body2" sx={{ mb: 2 }}>
        {typeof errorStatus === 'string'
          ? errorStatus
          : t('booking.error.generic')}
      </Typography>
    ) : null

  const content = children ? (
    <>{children(nonBlockingErrorNode)}</>
  ) : (
    <>{nonBlockingErrorNode}</>
  )

  return (
    <ErrorBoundary FallbackComponent={BookingFallback}>{content}</ErrorBoundary>
  )
}

const BookingFallback: React.FC<FallbackProps> = ({ error }) => {
  const { t } = useI18n()
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
      <PublicLoadError
        title={t('booking.error.loadFailed')}
        detailMessage={error instanceof Error ? error.message : String(error)}
      />
    </Box>
  )
}
