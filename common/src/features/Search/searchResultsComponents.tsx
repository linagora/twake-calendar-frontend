import { formatDateInTimezone } from '@common/components/Event/utils/dateTimeFormatters'
import { stringAvatar } from '@common/components/Event/utils/eventUtils'
import Tooltip from '@common/components/Tooltip'
import { openMeetingInTwakeSpace } from '@common/features/Embed/twakeSpace'
import { EventDescriptionBuilder } from '@common/utils/EventDescriptionBuilder'
import { getCalendarOwnerAttendee } from '@common/utils/getCalendarOwnerAttendee'
import { Calendar } from '@common/types/CalendarTypes'
import { SearchEventData } from './types/SearchEventData'
import { Box, Button, radius, Typography, useTheme } from '@linagora/twake-mui'
import { Avatar } from '@common/ds/Avatar/Avatar'
import RepeatIcon from '@mui/icons-material/Repeat'
import VideocamIcon from '@mui/icons-material/Videocam'
import React from 'react'

interface DateProps {
  startDate: Date
  endDate: Date
  allDay: boolean
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

const ONE_DAY_MS = 24 * 60 * 60 * 1000

// The zone to read the days of a result in. An all-day result starts at UTC
// midnight of its day: read in the zone of the user, that is the day before
// west of UTC.
export const dayZoneOf = (allDay: boolean, timeZone: string): string =>
  allDay ? 'UTC' : timeZone

// The answer of the calendar owner, as the grid chip of the same event says it
export const ownerPartstatOf = (
  calendar: Calendar | undefined,
  data: SearchEventData
): string | undefined =>
  getCalendarOwnerAttendee(
    calendar,
    data.attendees,
    data.organizer && 'cal_address' in data.organizer
      ? data.organizer
      : undefined
  )?.partstat

// The end (DTEND) of an all-day event is the day following its last day.
// An end before the start (accepted by the server) falls back to the start.
export const lastDayOf = (
  startDate: Date,
  endDate: Date,
  allDay: boolean
): Date =>
  new Date(
    Math.max(
      startDate.getTime(),
      allDay ? endDate.getTime() - ONE_DAY_MS : endDate.getTime()
    )
  )

export const RenderDate: React.FC<DateProps> = ({
  startDate,
  endDate,
  allDay,
  t,
  timeZone
}) => {
  const lastDay = lastDayOf(startDate, endDate, allDay)
  const dayKey = (d: Date): string => formatDateInTimezone(d, timeZone)
  const yearOf = (date: Date): string =>
    date.toLocaleDateString('en', { year: 'numeric', timeZone })
  const currentYear = yearOf(new Date())
  const formatDay = (date: Date): string =>
    date.toLocaleDateString(t('locale'), {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      ...(yearOf(date) !== currentYear ? ({ year: 'numeric' } as const) : {}),
      timeZone
    })
  return (
    <Typography sx={{ fontSize: '22px', minWidth: '90px' }}>
      {formatDay(startDate)}
      {dayKey(startDate) !== dayKey(lastDay) && (
        <>
          {' - '}
          {formatDay(lastDay)}
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
        fontWeight: 400
      }}
      style={styles}
    >
      {startDate.toLocaleTimeString(t('locale'), {
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      })}
      {endDate >= startDate && (
        <>
          {' - '}
          {endDate.toLocaleTimeString(t('locale'), {
            hour: '2-digit',
            minute: '2-digit',
            timeZone
          })}
        </>
      )}
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
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 1,
          minWidth: '240px',
          flex: '1 1 30%',
          alignItems: 'center'
        }}
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
            sx={{ flexShrink: 0, color: theme.vars.palette.text.primary }}
          />
        )}
      </Box>
    </Tooltip>
  )
}

export const RenderOrganizer: React.FC<OrganizerProps> = ({ organizer }) => {
  if (!organizer?.cn && !organizer?.email) {
    return null
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
          flex: '0 1 auto',
          maxWidth: '100%'
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
  return <RenderText text={text} sx={{ flex: 1 }} />
}

export const RenderDescription: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <RenderText
      text={new EventDescriptionBuilder(text ?? '')
        .removeFooter()
        .buildPlainText()}
      sx={{ flex: 2 }}
    />
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
            backgroundColor: theme.vars.palette.success.main,
            borderRadius: '50%',
            width: 20,
            height: 20
          }}
        >
          <VideocamIcon
            sx={{ color: theme.vars.palette.info.contrastText, fontSize: 14 }}
          />
        </Box>
      }
      sx={{
        flex: '0 1 auto',
        ml: 'auto',
        minWidth: 0,
        '& .MuiButton-startIcon': { flexShrink: 0 },
        backgroundColor: theme.vars.palette.action.selected,
        color: theme.vars.palette.text.primary,
        textTransform: 'none',
        fontWeight: 500,
        borderRadius: radius.md,
        '&:hover': {
          backgroundColor: theme.vars.palette.action.focus
        }
      }}
      onClick={e => {
        e.stopPropagation()
        try {
          const parsed = new URL(url)
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
            return
          if (openMeetingInTwakeSpace(parsed.toString())) return
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

interface DayBadgeProps {
  dayNum: string
  dayName: string
  isToday: boolean
}

export const DayBadge: React.FC<DayBadgeProps> = ({
  dayNum,
  dayName,
  isToday
}) => {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isToday ? (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
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
            color: `rgb(${theme.vars.palette.text.primaryChannel})`,
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
          color: theme.alpha(theme.vars.palette.text.primary, 0.48),
          textTransform: 'uppercase'
        }}
      >
        {dayName}
      </Typography>
    </Box>
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
      <DayBadge dayNum={dayNum} dayName={dayName} isToday={isToday} />
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
