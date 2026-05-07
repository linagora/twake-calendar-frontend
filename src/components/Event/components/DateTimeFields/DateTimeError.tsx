import { Box, Typography } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'

export interface DateTimeErrorProps {
  message: string
}

export const DateTimeError: React.FC<DateTimeErrorProps> = ({ message }) => {
  const { t } = useI18n()
  if (!message) {
    return null
  }
  return (
    <Box display="flex" gap={1} flexDirection="row">
      <Box sx={{ width: '1%' }} />
      <Box>
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {t(message)}
        </Typography>
      </Box>
    </Box>
  )
}
