import { AppDispatch } from '@common/app/store'
import { ResourceIcon } from '@common/components/Attendees/ResourceIcon'
import {
  emptyEventsCal,
  getCalendarDetail,
  getCalendarsList,
  refreshCalendarWithSyncToken
} from '@common/features/Calendars/CalendarSlice'
import { userAttendee } from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'
import { getInitials, stringToGradient } from '@common/utils/avatarUtils'
import { formatDateToYYYYMMDDTHHMMSS } from '@common/utils/dateUtils'
import { Avatar, Badge, Box, Typography } from '@linagora/twake-mui'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { PartStat } from '@common/features/User/models/attendee'

export const classIcon = (partStat?: PartStat) => {
  switch (partStat) {
    case 'ACCEPTED':
      return (
        <Box sx={{ color: 'success.main' }}>
          <CheckCircleIcon fontSize="inherit" color="inherit" />
        </Box>
      )
    case 'DECLINED':
      return (
        <Box sx={{ color: 'error.main' }}>
          <CancelIcon fontSize="inherit" color="inherit" />
        </Box>
      )
    default:
      return null
  }
}

export function renderAttendeeBadge(
  a: userAttendee,
  key: string,
  t: (key: string) => string,
  isFull?: boolean,
  isOrganizer?: boolean,
  caption?: string
) {
  const icon = classIcon(a.partstat)
  if (!isFull) {
    return <Avatar key={key} {...stringAvatar(a.cn || a.cal_address)} />
  } else {
    return (
      <Box
        key={key}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          marginBottom: 0.5,
          padding: 0.5,
          borderRadius: 1
        }}
      >
        {a.cutype === 'RESOURCE' && (
          <Box sx={{ marginRight: 2 }}>
            <ResourceIcon />
          </Box>
        )}
        {a.cutype !== 'RESOURCE' && (
          <Badge
            overlap="circular"
            sx={{ marginRight: 2 }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              icon && (
                <Box
                  style={{
                    fontSize: 14,
                    lineHeight: 0,
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    padding: '1px'
                  }}
                >
                  {icon}
                </Box>
              )
            }
          >
            <Avatar {...stringAvatar(a.cn || a.cal_address)} />
          </Badge>
        )}
        <Box style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Typography variant="body2" noWrap>
            {a.cn || a.cal_address}
          </Typography>
          {isOrganizer && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('event.organizer')}
            </Typography>
          )}
          {caption && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {caption}
            </Typography>
          )}
        </Box>
      </Box>
    )
  }
}

export function stringToColor(string: string) {
  let hash = 0
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash)
  }

  let color = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    color += `00${value.toString(16)}`.slice(-2)
  }

  return color
}

export function stringAvatar(name: string) {
  return {
    color: stringToGradient(name),
    children: getInitials(name)
  }
}

export async function refreshCalendars(
  dispatch: AppDispatch,
  calendars: Calendar[],
  calendarRange: {
    start: Date
    end: Date
  },
  calType?: 'temp'
) {
  if (process.env.NODE_ENV === 'test') return

  if (!calType) {
    await dispatch(getCalendarsList())
  }

  const results = await Promise.allSettled(
    calendars.map(calendar =>
      dispatch(
        refreshCalendarWithSyncToken({ calendar, calType, calendarRange })
      ).unwrap()
    )
  )

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `Failed to refresh calendar ${calendars[index].id}:`,
        result.reason
      )
    }
  })
}

export async function refreshSingularCalendar(
  dispatch: AppDispatch,
  calendar: Calendar,
  calendarRange: { start: Date; end: Date },
  calType?: 'temp'
) {
  const isTestEnv = process.env.NODE_ENV === 'test'
  dispatch(emptyEventsCal({ calId: calendar.id, calType }))

  if (isTestEnv) {
    return
  }

  await dispatch(
    getCalendarDetail({
      calId: calendar.id,
      match: {
        start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
        end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end)
      },
      calType
    })
  )
}
