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
import { AttendeePopover } from '@common/components/Attendees/AttendeePopover'
import { PartStat } from '@common/features/User/models/attendee'

export const classIcon = (partStat?: PartStat): JSX.Element | null => {
  switch (partStat) {
    case 'ACCEPTED':
      return (
        <Box
          sx={{ color: 'success.main', display: 'flex', alignItems: 'center' }}
        >
          <CheckCircleIcon fontSize="inherit" color="inherit" />
        </Box>
      )
    case 'DECLINED':
      return (
        <Box
          sx={{ color: 'error.main', display: 'flex', alignItems: 'center' }}
        >
          <CancelIcon fontSize="inherit" color="inherit" />
        </Box>
      )
    default:
      return null
  }
}

function renderSimpleAttendeeBadge(
  a: userAttendee,
  key: string,
  isPublic?: boolean
): JSX.Element {
  return (
    <AttendeePopover key={key} attendee={a} isPublic={isPublic}>
      <Avatar {...stringAvatar(a?.cn || a?.cal_address)} />
    </AttendeePopover>
  )
}

function renderFullAttendeeBadge({
  a,
  key,
  t,
  isOrganizer,
  caption,
  isPublic
}: {
  a: userAttendee
  key: string
  t: (key: string) => string
  isOrganizer?: boolean
  caption?: string
  isPublic?: boolean
}): JSX.Element {
  const icon = classIcon(a.partstat)
  const displayName = a.cn || a.cal_address

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
      {a.cutype === 'RESOURCE' ? (
        <Box sx={{ marginRight: 2 }}>
          <ResourceIcon />
        </Box>
      ) : (
        <AttendeePopover attendee={a} isPublic={isPublic}>
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
            <Avatar {...stringAvatar(displayName)} />
          </Badge>
        </AttendeePopover>
      )}
      <Box style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AttendeePopover attendee={a} isPublic={isPublic}>
          <Typography variant="body2" noWrap>
            {displayName}
          </Typography>
        </AttendeePopover>
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

export function renderAttendeeBadge({
  a,
  key,
  t,
  isFull,
  isOrganizer,
  caption,
  isPublic
}: {
  a: userAttendee
  key: string
  t: (key: string) => string
  isFull?: boolean
  isOrganizer?: boolean
  caption?: string
  isPublic?: boolean
}): JSX.Element {
  if (!a) return <></>

  if (!isFull) {
    return renderSimpleAttendeeBadge(a, key, isPublic)
  }
  return renderFullAttendeeBadge({ a, key, t, isOrganizer, caption, isPublic })
}

export function stringToColor(string: string): string {
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

export function stringAvatar(name: string): {
  color?: string
  children: string
} {
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
): Promise<void> {
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
): Promise<void> {
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
