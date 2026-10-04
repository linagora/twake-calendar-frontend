import { Box, Typography } from '@linagora/twake-mui'
import React, { createContext, useContext } from 'react'
import { useI18n } from 'twake-i18n'

/**
 * Id of the date / time error message currently displayed, if any: the
 * fields in error point to it with aria-describedby.
 */
export const DateTimeErrorIdContext = createContext<string | undefined>(
  undefined
)

export const useDateTimeErrorId = (): string | undefined =>
  useContext(DateTimeErrorIdContext)

export interface DateTimeErrorProps {
  message: string
  warning?: boolean
  id?: string
}

export const DateTimeError: React.FC<DateTimeErrorProps> = ({
  message,
  warning,
  id
}) => {
  const { t } = useI18n()
  if (!message) {
    return null
  }
  return (
    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'row' }}>
      <Box sx={{ width: '1%' }} />
      <Box>
        <Typography
          id={id}
          role={warning ? 'status' : 'alert'}
          variant="caption"
          sx={{ color: warning ? 'warning.dark' : 'error.main' }}
        >
          {t(message)}
        </Typography>
      </Box>
    </Box>
  )
}
