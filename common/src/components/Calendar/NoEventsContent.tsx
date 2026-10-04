import React from 'react'
import { Box, CircularProgress, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import logo from '@common/static/noResult-logo.svg'

export interface NoEventsContentProps {
  isPending: boolean
}

export const NoEventsContent: React.FC<NoEventsContentProps> = ({
  isPending
}) => {
  const { t } = useI18n()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        padding: '24px'
      }}
    >
      {isPending ? (
        <CircularProgress size={24} />
      ) : (
        <>
          <img
            className="logoNoResults"
            src={logo}
            alt={t('event.noEventsToDisplay')}
          />
          <Typography component="p" variant="h6" sx={{ color: 'text.primary' }}>
            {t('event.noEventsToDisplay')}
          </Typography>
        </>
      )}
    </Box>
  )
}
