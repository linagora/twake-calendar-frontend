import { Box, Typography } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import logo from '@common/static/noResult-logo.svg'

interface EventLoadErrorProps {
  errorDetail: string | undefined
}

export const EventLoadError: React.FC<EventLoadErrorProps> = ({
  errorDetail
}) => {
  const { t } = useI18n()
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <img src={logo} alt={t('search.noResults')} />
      <Typography color="error" variant="h5">
        {t('error.cannotLoadEvent')}
      </Typography>
      {errorDetail && (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          {errorDetail}
        </Typography>
      )}
    </Box>
  )
}

interface PreviewContainerProps {
  children: React.ReactNode
}

export const PreviewContainer: React.FC<PreviewContainerProps> = ({
  children
}) => (
  <Box
    sx={{
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '600px',
      padding: { xs: '24px', sm: '32px' },
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}
  >
    {children}
  </Box>
)
