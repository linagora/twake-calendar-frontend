import { Box, Typography, useTheme } from '@linagora/twake-mui'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { RepetitionObject } from '@common/types/Repetition'
import {
  formatLocalizedDate,
  formatTimezoneWithOffset
} from '@common/components/Event/utils/dateTimeFormatters'
import { SectionPreviewRow } from './SectionPreviewRow'
import { makeRecurrenceString } from '@common/components/EventPreview/utils/makeRecurrenceString'
import { isDateInPast } from '@common/components/Event/utils/formValidation'

interface DateTimeSummaryProps {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allday: boolean
  timezone: string
  repetition: RepetitionObject
  showEndDate: boolean
  onClick: () => void
}

export const DateTimeSummary: React.FC<DateTimeSummaryProps> = ({
  startDate,
  startTime,
  endDate,
  endTime,
  allday,
  timezone,
  repetition,
  showEndDate,
  onClick
}) => {
  const { t, lang } = useI18n()
  const theme = useTheme()

  // Format time in 24h: "03:30 - 16:30"
  const formatTime = (startTimeStr: string, endTimeStr: string): string => {
    if (allday || !startTimeStr || !endTimeStr) return ''

    const toHHmm = (timeStr: string): string => {
      const [h, m] = timeStr.split(':').map(s => parseInt(s, 10) || 0)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    return `${toHHmm(startTimeStr)} - ${toHHmm(endTimeStr)}`
  }

  // Format repeat: "Doesn't repeat" or repeat info
  const formatRepeat = (rep: RepetitionObject): string => {
    if (!rep || !rep.freq) {
      return t('event.repeat.doesNotRepeat')
    }

    return (
      makeRecurrenceString({
        repetition: rep,
        t,
        startText: '',
        joinChar: '',
        enableStrForOneTimeInterval: true
      }) || ''
    )
  }

  // Format date text: show both start and end date if showEndDate is true
  const formatDateText = (): string => {
    const shouldShowBothDates =
      showEndDate && Boolean(endDate) && endDate !== startDate

    if (shouldShowBothDates) {
      const startDateText = formatLocalizedDate(startDate, lang)
      const endDateText = formatLocalizedDate(endDate, lang)
      return `${startDateText} - ${endDateText}`
    }
    return formatLocalizedDate(startDate, lang)
  }

  const dateText = formatDateText()
  const timeText = formatTime(startTime, endTime)
  const timezoneText = formatTimezoneWithOffset(timezone, startDate)
  const repeatText = formatRepeat(repetition)
  const startDateInPast = isDateInPast(startDate)
  const ariaLabel = [
    dateText,
    timeText,
    timezoneText,
    repeatText,
    startDateInPast ? t('event.validation.startDateInPast') : ''
  ]
    .filter(Boolean)
    .join(', ')

  // Don't render if no date
  if (!startDate) {
    return null
  }

  const primaryStyle = {
    fontSize: '14px',
    fontWeight: 500,
    color: theme.vars.palette.text.primary
  }

  return (
    <SectionPreviewRow
      icon={
        <Box sx={{ color: 'text.secondary' }}>
          <AccessTimeIcon sx={{ color: 'inherit' }} />
        </Box>
      }
      onClick={onClick}
      ariaLabel={ariaLabel}
    >
      <Box>
        <Typography component="p" sx={primaryStyle}>
          {dateText}
          {showEndDate && <br />}
          {timeText && (
            <Box component="span" sx={{ ml: showEndDate ? 0 : 2 }}>
              {timeText}
            </Box>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#444746' }}>
            {timezoneText}
          </Typography>
          <Typography variant="caption" sx={{ color: '#444746' }}>
            {repeatText}
          </Typography>
        </Box>
        {startDateInPast && (
          <Typography
            variant="caption"
            sx={{ color: 'warning.dark', display: 'block', mt: 0.5 }}
          >
            {t('event.validation.startDateInPast')}
          </Typography>
        )}
      </Box>
    </SectionPreviewRow>
  )
}
