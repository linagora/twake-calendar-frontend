import { ResourceIcon } from '@common/components/Attendees/ResourceIcon'
import { userAttendee } from '@common/features/User/models/attendee'
import { Badge, Box, Typography } from '@linagora/twake-mui'
import { Avatar } from '@common/ds/Avatar/Avatar'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { AttendeePopover } from '@common/components/Attendees/AttendeePopover'
import { PartStat } from '@common/features/User/models/attendee'
import Tooltip from '@common/components/Tooltip'
import GroupsIcon from '@mui/icons-material/Groups'
import { stringAvatar } from './eventUtils'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { stripMailto } from '@common/utils/normalizeIdentity'

type Translate = (key: string, options?: Record<string, string>) => string

const clickableCaptionSx = {
  color: 'text.secondary',
  cursor: 'pointer',
  '&:hover': {
    color: 'primary.main'
  },
  '&:active': {
    color: 'primary.dark'
  }
}

/**
 * The organizer stated by the event and the delegate who actually sent it may
 * differ, which is exactly what a phishing attempt exploits: spelling the
 * sender out, and letting the user inspect their contact, is the disclosure.
 */
function OrganizerSentBy({
  sentBy,
  t
}: {
  sentBy: string
  t: Translate
}): JSX.Element {
  const email = stripMailto(sentBy)

  return (
    <AttendeePopover attendee={new userAttendee({ cal_address: email })}>
      <Typography variant="caption" sx={clickableCaptionSx}>
        {t('event.sentBy', { email })}
      </Typography>
    </AttendeePopover>
  )
}

export const classIcon = (
  partStat?: PartStat,
  fontSize?: string
): JSX.Element | null => {
  switch (partStat) {
    case 'ACCEPTED':
      return (
        <Box
          sx={{ color: 'success.main', display: 'flex', alignItems: 'center' }}
        >
          <CheckCircleIcon
            sx={{ fontSize: fontSize ?? 'inherit' }}
            color="inherit"
          />
        </Box>
      )
    case 'DECLINED':
      return (
        <Box
          sx={{ color: 'error.main', display: 'flex', alignItems: 'center' }}
        >
          <CancelIcon
            sx={{ fontSize: fontSize ?? 'inherit' }}
            color="inherit"
          />
        </Box>
      )
    default:
      return null
  }
}

function renderSimpleAttendeeBadge(a: userAttendee, key: string): JSX.Element {
  return (
    <AttendeePopover key={key} attendee={a}>
      <Avatar {...stringAvatar(a?.cn || a?.cal_address)} />
    </AttendeePopover>
  )
}

function renderTeamOrganizerSimpleBadge(
  a: userAttendee,
  key: string
): JSX.Element {
  return (
    <Avatar key={key} {...stringAvatar(a?.cn)}>
      <GroupsIcon />
    </Avatar>
  )
}

function renderTeamOrganizerFullBadge({
  a,
  key,
  t,
  originalOrganizer,
  sentBy
}: {
  a: userAttendee
  key: string
  t: Translate
  originalOrganizer: userAttendee
  sentBy?: string
}): JSX.Element {
  const icon = classIcon(a.partstat)
  const displayName = a.cn || a.cal_address
  const organizerName =
    originalOrganizer.cn || originalOrganizer.cal_address || ''

  const translatedStr = t('event.teamOrganizerWithName', {
    organizerName
  })

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
        <Avatar {...stringAvatar(displayName)}>
          <GroupsIcon />
        </Avatar>
      </Badge>
      <Box style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" noWrap>
            {displayName}
          </Typography>
          <Tooltip
            title={t('tooltip.eventInTeamCalendar', {
              teamName: displayName
            })}
          >
            <InfoOutlinedIcon
              sx={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                color: 'text.secondary'
              }}
            />
          </Tooltip>
        </Box>
        <AttendeePopover attendee={originalOrganizer}>
          <Typography variant="caption" sx={clickableCaptionSx}>
            {translatedStr}
          </Typography>
        </AttendeePopover>
        {sentBy && <OrganizerSentBy sentBy={sentBy} t={t} />}
      </Box>
    </Box>
  )
}

function renderFullAttendeeBadge({
  a,
  key,
  t,
  isOrganizer,
  isTeamCalendar,
  caption,
  sentBy
}: {
  a: userAttendee
  key: string
  t: Translate
  isOrganizer?: boolean
  isTeamCalendar?: boolean
  caption?: string
  sentBy?: string
}): JSX.Element {
  const icon = classIcon(a.partstat)
  const displayName = a.cn || a.cal_address
  const nameText = (
    <Typography variant="body2" noWrap>
      {displayName}
    </Typography>
  )
  // Nesting a popover inside another one would open both at once: the sender's
  // contact card takes the whole-badge one's place, the name keeping its own.
  const name = sentBy ? (
    <AttendeePopover attendee={a}>{nameText}</AttendeePopover>
  ) : (
    nameText
  )

  const badge = (
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
      )}
      <Box style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {name}
        {isOrganizer && (
          <Tooltip
            title={
              isTeamCalendar ? t('tooltip.teamOrganizer', { displayName }) : ''
            }
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                cursor: isTeamCalendar ? 'pointer' : 'default'
              }}
            >
              {isTeamCalendar ? t('event.teamOrganizer') : t('event.organizer')}
            </Typography>
          </Tooltip>
        )}
        {caption && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {caption}
          </Typography>
        )}
        {sentBy && <OrganizerSentBy sentBy={sentBy} t={t} />}
      </Box>
    </Box>
  )

  if (sentBy) return badge

  return (
    <AttendeePopover attendee={a} key={key}>
      {badge}
    </AttendeePopover>
  )
}

export function renderAttendeeBadge({
  a,
  key,
  t,
  isFull,
  isOrganizer,
  isTeamCalendar,
  caption,
  isTeamOverride,
  originalOrganizer,
  sentBy
}: {
  a: userAttendee
  key: string
  t: Translate
  isFull?: boolean
  isOrganizer?: boolean
  isTeamCalendar?: boolean
  caption?: string
  isTeamOverride?: boolean
  originalOrganizer?: userAttendee
  sentBy?: string
}): JSX.Element {
  if (!a) return <></>

  if (!isFull) {
    if (isTeamOverride && originalOrganizer) {
      return renderTeamOrganizerSimpleBadge(a, key)
    }
    return renderSimpleAttendeeBadge(a, key)
  }

  if (isTeamOverride && originalOrganizer) {
    return renderTeamOrganizerFullBadge({
      a,
      key,
      t,
      originalOrganizer,
      sentBy
    })
  }

  return renderFullAttendeeBadge({
    a,
    key,
    t,
    isOrganizer,
    isTeamCalendar,
    caption,
    sentBy
  })
}
