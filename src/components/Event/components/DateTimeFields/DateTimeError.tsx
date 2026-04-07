import { Box, Typography } from '@linagora/twake-mui'
import React from 'react'

export interface DateTimeErrorProps {
  message: string
}

export const DateTimeError: React.FC<DateTimeErrorProps> = ({ message }) => {
  if (!message) {
    return null
  }
  return (
    <Box display="flex" gap={1} flexDirection="row">
      <Box sx={{ width: '1%' }} />
      <Box>
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {message}
        </Typography>
      </Box>
    </Box>
  )
}
