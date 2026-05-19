import {
  getBestColor,
  getTitleStyle
} from '@/components/Event/EventChip/EventChipUtils'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { defaultColors } from '@/utils/defaultColors'
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardHeader,
  radius,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import RepeatIcon from '@mui/icons-material/Repeat'
import VideocamIcon from '@mui/icons-material/Videocam'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { SearchEventResult } from './types/SearchEventResult'

interface DateProps {
  startDate: Date
  endDate: Date
  t: (key: string) => string
  timeZone: string
}

interface TimeProps {
  startDate: Date
  endDate: Date
  allDay: boolean
  t: (key: string) => string
  timeZone: string
}

interface TitleProps {
  summary?: string
  isRecurrent: boolean
  t: (key: string) => string
}

interface OrganizerProps {
  organizer?: {
    cn?: string
    email?: string
  }
}

interface VideoJoinProps {
  url?: string
  t: (key: string) => string
}

interface MobileDateProps {
  startDate: Date
  t: (key: string) => string
  timeZone: string
}

interface MobileEventCardProps {
  eventData: SearchEventResult
  calendar: Calendar | undefined
  timeZone: string
}

export const RenderDate: React.FC<DateProps> = ({
  startDate,
  endDate,
  t,
  timeZone
}) => {
  const dayKey = (d: Date): string =>
    d.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone
    })
  return (
    <Typography sx={{ fontSize: '22px', minWidth: '90px' }}>
      {startDate.toLocaleDateString(t('locale'), {
        day: '2-digit',
        month: 'short',
        timeZone
      })}
      {dayKey(startDate) !== dayKey(endDate) && (
        <>
          {' - '}
          {endDate.toLocaleDateString(t('locale'), {
            day: '2-digit',
            month: 'short',
            timeZone
          })}
        </>
      )}
    </Typography>
  )
}

export const RenderTime: React.FC<TimeProps> = ({
  startDate,
  endDate,
  allDay,
  t,
  timeZone
}) => {
  if (allDay) return null
  return (
    <Typography sx={{ minWidth: '120px', fontSize: '16px', fontWeight: 400 }}>
      {startDate.toLocaleTimeString(t('locale'), {
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      })}
      {' - '}
      {endDate.toLocaleTimeString(t('locale'), {
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      })}
    </Typography>
  )
}

export const RenderTitle: React.FC<TitleProps> = ({
  summary,
  isRecurrent,
  t
}) => {
  const theme = useTheme()

  return (
    <Box
      display="flex"
      flexDirection="row"
      gap={1}
      sx={{ minWidth: 0, maxWidth: '150px', alignItems: 'center' }}
    >
      <Typography
        sx={{
          fontWeight: 500,
          fontSize: '17px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {summary || t('event.untitled')}
      </Typography>
      {isRecurrent && (
        <RepeatIcon
          sx={{ flexShrink: 0, color: alpha(theme.palette.grey[900], 0.9) }}
        />
      )}
    </Box>
  )
}

export const RenderOrganizer: React.FC<OrganizerProps> = ({ organizer }) => {
  if (!organizer?.cn && !organizer?.email) return null
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: '150px',
        maxWidth: '150px'
      }}
    >
      <Avatar
        alt={organizer.cn || organizer.email}
        sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
      >
        {(organizer.cn || organizer.email || '').charAt(0).toUpperCase()}
      </Avatar>
      <Typography
        variant="body1"
        sx={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1
        }}
      >
        {organizer.cn || organizer.email}
      </Typography>
    </Box>
  )
}

export const RenderText: React.FC<{ text?: string }> = ({ text }) => {
  if (!text) return null
  return (
    <Typography
      variant="body2"
      sx={{
        color: 'text.secondary',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
        maxWidth: '200px'
      }}
    >
      {text.replace(/\n/g, ' ')}
    </Typography>
  )
}

export const RenderVideoJoin: React.FC<VideoJoinProps> = ({ url, t }) => {
  const theme = useTheme()

  if (!url) return null
  return (
    <Button
      variant="contained"
      disableElevation
      startIcon={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.palette.success.main,
            borderRadius: '50%',
            width: 20,
            height: 20
          }}
        >
          <VideocamIcon
            sx={{ color: theme.palette.info.contrastText, fontSize: 14 }}
          />
        </Box>
      }
      sx={{
        flexShrink: 0,
        ml: 'auto',
        backgroundColor: theme.palette.grey[200],
        color: theme.palette.text.primary,
        textTransform: 'none',
        fontWeight: 500,
        borderRadius: radius.md,
        '&:hover': {
          backgroundColor: theme.palette.grey[300]
        }
      }}
      onClick={e => {
        e.stopPropagation()
        try {
          const parsed = new URL(url)
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
            return
          window.open(parsed.toString(), '_blank', 'noopener,noreferrer')
        } catch {
          return
        }
      }}
    >
      {t('eventPreview.joinVideoShort')}
    </Button>
  )
}

export const RenderMobileDate: React.FC<MobileDateProps> = ({
  startDate,
  t,
  timeZone
}) => (
  <Box sx={{ width: '100%' }}>
    <Typography variant="h4" sx={{ fontWeight: 400 }}>
      {startDate.toLocaleDateString(t('locale'), { day: '2-digit', timeZone })}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {startDate
        .toLocaleDateString(t('locale'), { weekday: 'short', timeZone })
        .toUpperCase()}
    </Typography>
  </Box>
)

export const RenderMobileEventCard: React.FC<MobileEventCardProps> = ({
  eventData,
  calendar,
  timeZone
}) => {
  const { t } = useI18n()

  if (!calendar) return null

  const startDate = new Date(eventData.data.start)
  const bestColor = calendar.color
    ? getBestColor(calendar.color as { light: string; dark: string })
    : defaultColors[0].dark
  const titleStyle = getTitleStyle(bestColor, 'ACCEPTED', calendar, false)

  return (
    <Card
      variant="outlined"
      sx={{
        height: 'stretch',
        width: '100%',
        borderRadius: '8px',
        p: 1,
        boxShadow: 'none',
        backgroundColor: calendar?.color?.light,
        color: calendar?.color?.dark,
        border: '1px solid',
        borderColor: 'background.paper',
        display: 'flex'
      }}
      data-testid={`event-card-${eventData.data.uid}`}
    >
      <CardHeader
        sx={{ p: '0px', '& .MuiCardHeader-content': { overflow: 'hidden' } }}
        title={
          <Typography variant="body2" noWrap style={titleStyle}>
            {eventData.data.summary || t('event.untitled')}
          </Typography>
        }
        subheader={
          !eventData.data.allDay && (
            <Typography
              style={{
                color: titleStyle.color,
                opacity: '70%',
                fontFamily: 'Inter',
                fontWeight: '500',
                fontSize: '10px',
                lineHeight: '16px',
                letterSpacing: '0%',
                verticalAlign: 'middle'
              }}
            >
              {startDate.toLocaleTimeString(t('locale'), {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: timeZone
              })}
            </Typography>
          )
        }
      />
    </Card>
  )
}

interface DayIndicatorProps {
  isFirstRow: boolean
  isToday: boolean
  dayNum: string
  dayName: string
}

export const RenderDayIndicator: React.FC<DayIndicatorProps> = ({
  isFirstRow,
  isToday,
  dayNum,
  dayName
}) => {
  const theme = useTheme()

  if (!isFirstRow) {
    return <Box sx={{ width: '80px', flexShrink: 0 }} />
  }

  return (
    <Box
      sx={{
        width: '80px',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexShrink: 0
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isToday ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: '#FB9E3A',
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
            color: theme.palette.grey[500],
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
}

export const RenderListEventTime: React.FC<ListEventTimeProps> = ({
  allDay,
  startDate,
  endDate,
  timeZone,
  t
}) => {
  if (allDay) {
    return (
      <Typography
        sx={{
          fontSize: '16px',
          fontWeight: 400,
          width: '120px',
          flexShrink: 0
        }}
      >
        {t('event.form.allDay')}
      </Typography>
    )
  }

  return (
    <Box sx={{ width: '120px', flexShrink: 0 }}>
      <RenderTime
        startDate={startDate}
        endDate={endDate}
        allDay={false}
        t={t}
        timeZone={timeZone}
      />
    </Box>
  )
}
