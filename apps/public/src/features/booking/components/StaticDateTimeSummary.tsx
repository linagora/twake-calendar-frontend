import { LONG_DATE_FORMAT } from '@common/components/Event/utils/dateTimeFormatters'
import { getTimezoneOffset } from '@common/utils/timezone'
import { Box, Typography, alpha, useTheme } from '@linagora/twake-mui'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/fr'
import 'dayjs/locale/ru'
import 'dayjs/locale/vi'
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

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = dayjs(dateStr)
    const locale = lang && ['en', 'vi', 'fr', 'ru'].includes(lang) ? lang : 'en'

    if (locale === 'vi') {
      const dow = date.day()
      const weekdayLabel = dow === 0 ? 'Chủ nhật' : `Thứ ${dow + 1}`
      const day = date.date()
      const month = date.month() + 1
      const year = date.year()
      return `${weekdayLabel}, ${day} Tháng ${month}, ${year}`
    }

    if (locale === 'fr') {
      const formatted = date.locale('fr').format('dddd, D MMMM YYYY')
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }

    const formatted = date.locale(locale).format(LONG_DATE_FORMAT)
    if (locale === 'ru') {
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }
    return formatted
  }

  const formatTime = (startTimeStr: string, endTimeStr: string): string => {
    if (!startTimeStr || !endTimeStr) return ''
    const toHHmm = (timeStr: string): string => {
      const [h, m] = timeStr.split(':').map(s => parseInt(s, 10) || 0)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    return `${toHHmm(startTimeStr)} - ${toHHmm(endTimeStr)}`
  }

  const formatTimezone = (tz: string, dateStr?: string): string => {
    if (!tz) return ''
    try {
      const dateForOffset = dateStr ? dayjs(dateStr).toDate() : new Date()
      const offset = getTimezoneOffset(tz, dateForOffset)
      const tzName = tz.replace(/_/g, ' ')
      return `(${offset}) ${tzName}`
    } catch {
      return tz.replace(/_/g, ' ')
    }
  }

  const dateText = formatDate(startDate)
  const timeText = formatTime(startTime, endTime)
  const timezoneText = formatTimezone(timezone, startDate)

  const primaryStyle = {
    fontSize: '14px',
    fontWeight: 500,
    color: alpha(theme.palette.grey[900], 0.9)
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
        <Typography variant="caption" sx={{ color: '#444746' }}>
          {timezoneText}
        </Typography>
      </Box>
    </Box>
  )
}
