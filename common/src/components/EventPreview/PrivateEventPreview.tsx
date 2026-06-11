import { Box, Typography } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'

export const PrivateEventPreview: React.FC = () => {
  const { t } = useI18n()

  return (
    <Box
      sx={{
        backgroundColor: '#F3F4F6',
        height: 48,
        borderRadius: '8px',
        gap: '16px',
        paddingTop: '16px',
        paddingBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Typography
        variant="caption"
        sx={{
          textAlign: 'center'
        }}
      >
        {t('eventPreview.privateEvent.hiddenDetails')}
      </Typography>
    </Box>
  )
}
