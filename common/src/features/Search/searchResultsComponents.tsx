import { stringAvatar } from '@common/components/Event/utils/eventUtils'
import Tooltip from '@common/components/Tooltip'
import {
  alpha,
  Avatar,
  Box,
  Button,
  radius,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import RepeatIcon from '@mui/icons-material/Repeat'
import VideocamIcon from '@mui/icons-material/Videocam'
import React from 'react'

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
  styles?: React.CSSProperties
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
  timeZone,
  styles
}) => {
  if (allDay) return null
  return (
    <Typography
      sx={{
        minWidth: '120px',
        fontSize: '16px',
        fontWeight: 400,
        ...(styles || {})
      }}
    >
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
    <Tooltip title={summary || t('event.untitled')}>
      <Box
        display="flex"
        flexDirection="row"
        gap={1}
        sx={{ minWidth: 0, flex: '0 0 12%', alignItems: 'center' }}
      >
        <Typography
          sx={{
            fontWeight: 500,
            fontSize: '17px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0
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
    </Tooltip>
  )
}

export const RenderOrganizer: React.FC<OrganizerProps> = ({ organizer }) => {
  if (!organizer?.cn && !organizer?.email) {
    return <Box sx={{ minWidth: 0, flex: '0 0 20%' }} />
  }

  const organizerName = organizer.cn || organizer.email

  return (
    <Tooltip title={organizerName}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
          maxWidth: '15%',
          marginRight: 3
        }}
      >
        <Avatar
          alt={organizerName}
          sx={{ width: 24, height: 24, fontSize: '0.75rem', flexShrink: 0 }}
          {...stringAvatar(organizerName || '')}
        />
        <Typography
          variant="body1"
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0
          }}
        >
          {organizerName}
        </Typography>
      </Box>
    </Tooltip>
  )
}

interface RenderTextProps {
  text?: string
  sx?: React.ComponentProps<typeof Typography>['sx']
}

export const RenderText: React.FC<RenderTextProps> = ({ text, sx }) => {
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
        ...sx
      }}
    >
      {text.replace(/\n/g, ' ')}
    </Typography>
  )
}

export const RenderLocation: React.FC<{ text?: string }> = ({ text }) => {
  return <RenderText text={text} sx={{ flex: '0 1 auto', maxWidth: '20%' }} />
}

export const RenderDescription: React.FC<{ text?: string }> = ({ text }) => {
  return <RenderText text={text} sx={{ flex: '1 1 0%' }} />
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
