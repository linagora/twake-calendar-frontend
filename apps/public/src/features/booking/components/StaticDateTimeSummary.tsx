import {
  formatLocalizedDate,
  formatTimezoneWithOffset
} from '@common/components/Event/utils/dateTimeFormatters'
import { Box, Typography, useTheme } from '@linagora/twake-mui'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import React from 'react'
import { useI18n } from 'twake-i18n'

interface StaticDateTimeSummaryProps {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  timezone: string
}

/**
 * Non-hover date/time display for booking confirmation dialog.
 * Based on DateTimeSummary but without interactive hover effects.
 */
export const StaticDateTimeSummary: React.FC<StaticDateTimeSummaryProps> = ({
  startDate,
  startTime,
  endTime,
  timezone
}) => {
  const { lang } = useI18n()
  const theme = useTheme()

  const formatTime = (startTimeStr: string, endTimeStr: string): string => {
    if (!startTimeStr || !endTimeStr) return ''
    const toHHmm = (timeStr: string): string => {
      const [h, m] = timeStr.split(':').map(s => parseInt(s, 10) || 0)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    return `${toHHmm(startTimeStr)} - ${toHHmm(endTimeStr)}`
  }

  const dateText = formatLocalizedDate(startDate, lang)
  const timeText = formatTime(startTime, endTime)
  const timezoneText = formatTimezoneWithOffset(timezone, startDate)

  const primaryStyle = {
    fontSize: '14px',
    fontWeight: 500,
    color: theme.vars.palette.text.primary
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', padding: '8px 0px' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '24px',
          maxHeight: '24px',
          marginRight: '12px',
          flexShrink: 0,
          color: 'text.secondary'
        }}
      >
        <AccessTimeIcon />
      </Box>
      <Box>
        <Typography component="p" sx={primaryStyle}>
          {dateText}
          {timeText && (
            <Box component="span" sx={{ ml: 2 }}>
              {timeText}
            </Box>
          )}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.primary' }}>
          {timezoneText}
        </Typography>
      </Box>
    </Box>
  )
}
