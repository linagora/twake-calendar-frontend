import { Box, Typography, useTheme } from '@linagora/twake-mui'
import React from 'react'
import { RenderTime } from './searchResultsComponents'
import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'

interface DayIndicatorProps {
  isFirstRow: boolean
  isToday: boolean
  dayNum: string
  dayName: string
  isMobile?: boolean
}

export const RenderDayIndicator: React.FC<DayIndicatorProps> = ({
  isFirstRow,
  isToday,
  dayNum,
  dayName,
  isMobile
}) => {
  const theme = useTheme()
  // R-08, high contrast mode: white on #FB9E3A was 2.09:1, the weekday 2.27:1
  const highContrast = useHighContrast()

  if (!isFirstRow) {
    return <Box sx={{ width: isMobile ? '60px' : '80px', flexShrink: 0 }} />
  }

  return (
    <Box
      sx={{
        width: isMobile ? '60px' : '80px',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexShrink: 0
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 0 : 1,
          flexDirection: isMobile ? 'column' : 'row'
        }}
      >
        {isToday ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: highContrast ? '#B5470F' : '#FB9E3A',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0
            }}
          >
            {dayNum}
          </Box>
        ) : (
          <Typography
            sx={{
              fontSize: '22px',
              color: theme.palette.grey[900],
              minWidth: '32px',
              textAlign: 'center'
            }}
          >
            {dayNum}
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: '14px',
            color: highContrast ? 'text.secondary' : theme.palette.grey[500],
            textTransform: 'uppercase'
          }}
        >
          {dayName}
        </Typography>
      </Box>
    </Box>
  )
}

interface ListEventTimeProps {
  allDay: boolean
  startDate: Date
  endDate: Date
  timeZone: string
  t: (key: string) => string
  isStart?: boolean
  isEnd?: boolean
  styles?: React.CSSProperties
}

export const RenderListEventTime: React.FC<ListEventTimeProps> = ({
  allDay,
  startDate,
  endDate,
  timeZone,
  t,
  isStart = true,
  isEnd = true,
  styles
}) => {
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone
  }

  const isSingleDay = isStart && isEnd
  const showNormalTime = isSingleDay && !allDay

  if (showNormalTime) {
    return (
      <Box sx={{ width: '120px', flexShrink: 0 }}>
        <RenderTime
          startDate={startDate}
          endDate={endDate}
          allDay={false}
          t={t}
          timeZone={timeZone}
          styles={styles}
        />
      </Box>
    )
  }

  const isMultiDayStart = !allDay && isStart && !isEnd
  const isMultiDayEnd = !allDay && !isStart && isEnd

  let timeText = t('event.form.allDay')
  if (isMultiDayStart) {
    timeText = startDate.toLocaleTimeString(t('locale'), timeOpts)
  } else if (isMultiDayEnd) {
    timeText = `${t('event.list.until')} ${endDate.toLocaleTimeString(t('locale'), timeOpts)}`
  }

  return (
    <Typography
      sx={{
        fontSize: '16px',
        fontWeight: 400,
        width: '120px',
        flexShrink: 0
      }}
      style={styles}
    >
      {timeText}
    </Typography>
  )
}
