import { Box, Typography } from '@linagora/twake-mui'
import React from 'react'
import logo from '@common/static/noResult-logo.svg'

export interface PublicLoadErrorProps {
  title: string
  detailMessage?: string
  action?: React.ReactNode
}

export const PublicLoadError: React.FC<PublicLoadErrorProps> = ({
  title,
  detailMessage,
  action
}) => {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <img src={logo} alt="" />
      <Typography component="h1" color="error" variant="h5">
        {title}
      </Typography>
      {detailMessage && (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          {detailMessage}
        </Typography>
      )}
      {action && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          {action}
        </Box>
      )}
    </Box>
  )
}
