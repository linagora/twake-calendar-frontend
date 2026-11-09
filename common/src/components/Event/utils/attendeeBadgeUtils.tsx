import type { JSX } from 'react'
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

const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap'
} as const

const ANSWERED_PARTSTATS: PartStat[] = ['ACCEPTED', 'DECLINED', 'TENTATIVE']

const answerText = (partstat: PartStat, t: Translate): string | undefined =>
  ANSWERED_PARTSTATS.includes(partstat)
    ? t(`eventPreview.attendingStatus.${partstat}`)
    : undefined

/**
 * The answer badge of an avatar (see classIcon) is hidden from screen readers
 * along with the whole MUI badge: say it in text instead.
 */
function AnswerText({
  partstat,
  t
}: {
  partstat: PartStat
  t: Translate
}): JSX.Element | null {
  const answer = answerText(partstat, t)
  if (!answer) return null
  return (
    <Box component="span" sx={visuallyHidden}>
      {answer}
    </Box>
  )
}

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

function renderSimpleAttendeeBadge(
  a: userAttendee,
  key: string,
  t: Translate
): JSX.Element {
  // The bare avatar shows initials only: it names the button that wraps it
  const displayName = a?.cn || a?.cal_address
  const answer = answerText(a.partstat, t)
  return (
    <AttendeePopover key={key} attendee={a}>
      <Avatar
        {...stringAvatar(displayName)}
        role="img"
        aria-label={answer ? `${displayName}, ${answer}` : displayName}
      />
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
              sx={{ bgcolor: 'background.paper' }}
              style={{
                fontSize: 14,
                lineHeight: 0,
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
      <AnswerText partstat={a.partstat} t={t} />
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
                sx={{ bgcolor: 'background.paper' }}
                style={{
                  fontSize: 14,
                  lineHeight: 0,
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
      {a.cutype !== 'RESOURCE' && <AnswerText partstat={a.partstat} t={t} />}
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
    return renderSimpleAttendeeBadge(a, key, t)
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
