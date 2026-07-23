import { useAppSelector } from '@common/app/hooks'
import { useAttendeesFreeBusy } from '@common/components/Attendees/useFreeBusy'
import { renderAttendeeBadge } from '@common/components/Event/utils/eventUtils'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import {
  AvatarGroup,
  Box,
  Button,
  Typography,
  alpha,
  useTheme
} from '@linagora/twake-mui'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { makeAttendeePreview } from '.'
import { userAttendee } from '@common/features/User/models/attendee'

interface EventPreviewAttendeesProps {
  attendees: userAttendee[]
  organizer: userAttendee | undefined
  allAttendees: userAttendee[]
  start?: string
  end?: string
  timezone?: string
  eventUid?: string | null
}

const ATTENDEE_DISPLAY_LIMIT = 3

export function EventPreviewAttendees({
  attendees,
  organizer,
  allAttendees,
  start,
  end,
  timezone,
  eventUid
}: EventPreviewAttendeesProps): JSX.Element {
  const { t } = useI18n()
  const theme = useTheme()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const infoIconColor = alpha(theme.palette.grey[900], 0.9)
  const infoIconSx = { minWidth: '25px', marginRight: 2, color: infoIconColor }
  // Icon takes 25px width + 16px (mr: 2) = 41px, use negative margin to align avatars
  const mobileAvatarOffset = '-42px'
  const userEmail = useAppSelector(state => state.user.userData.email)
  const [showAllAttendees, setShowAllAttendees] = useState(false)

  const attendeePreview = makeAttendeePreview(allAttendees, t)

  const toFreeBusyAttendee = (
    a: userAttendee
  ): { email: string; userId: null } => ({
    email: a.cal_address,
    userId: null
  })

  const freeBusyMap = useAttendeesFreeBusy({
    existingAttendees: allAttendees
      .filter(
        attendee =>
          attendee.partstat !== 'ACCEPTED' && attendee.partstat !== 'DECLINED'
      )
      .map(toFreeBusyAttendee),
    newAttendees: [],
    start: start ?? '',
    end: end ?? '',
    timezone: timezone ?? 'UTC',
    eventUid: extractEventBaseUuid(eventUid ?? ''),
    enabled: !!(start && end && showAllAttendees)
  })

  const busyCaption = (a: userAttendee): string | undefined =>
    freeBusyMap[a.cal_address] === 'busy'
      ? a.cal_address === userEmail
        ? t('event.freeBusy.busyCalOwner')
        : t('event.freeBusy.busy')
      : undefined

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <Box sx={{ ...infoIconSx, mt: 1 }}>
          <PeopleAltOutlinedIcon />
        </Box>
        <Box
          sx={{
            marginBottom: 1,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2 : undefined
          }}
        >
          <Box
            sx={{
              marginRight: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box>
              <Typography>
                {t('eventPreview.guests', { count: allAttendees.length })}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                {attendeePreview}
              </Typography>
            </Box>
            {isMobile && showAllAttendees && (
              <Button
                variant="text"
                size="small"
                sx={{
                  marginLeft: 2,
                  fontSize: '14px',
                  color: 'text.secondary',
                  alignSelf: 'center'
                }}
                onClick={() => setShowAllAttendees(false)}
              >
                {t('eventPreview.showLess')}
              </Button>
            )}
          </Box>

          {!showAllAttendees && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                ml: isMobile ? mobileAvatarOffset : undefined
              }}
            >
              <AvatarGroup max={ATTENDEE_DISPLAY_LIMIT}>
                {organizer &&
                  renderAttendeeBadge({
                    a: organizer,
                    key: 'org',
                    t,
                    isFull: showAllAttendees,
                    isOrganizer: true
                  })}
                {attendees.map((a, idx) =>
                  renderAttendeeBadge({
                    a,
                    key: idx.toString(),
                    t,
                    isFull: showAllAttendees
                  })
                )}
              </AvatarGroup>
              <Button
                variant="text"
                size="small"
                sx={{
                  marginLeft: 2,
                  color: 'text.secondary',
                  alignSelf: 'center'
                }}
                onClick={() => setShowAllAttendees(true)}
              >
                {t('eventPreview.showMore')}
              </Button>
            </Box>
          )}

          {!isMobile && showAllAttendees && (
            <Button
              variant="text"
              size="small"
              sx={{
                marginLeft: 2,
                color: 'text.secondary',
                alignSelf: 'center'
              }}
              onClick={() => setShowAllAttendees(false)}
            >
              {t('eventPreview.showLess')}
            </Button>
          )}
        </Box>
      </Box>

      {showAllAttendees &&
        organizer &&
        renderAttendeeBadge({
          a: organizer,
          key: 'org',
          t,
          isFull: showAllAttendees,
          isOrganizer: true
        })}
      {showAllAttendees &&
        attendees.map((a, idx) =>
          renderAttendeeBadge({
            a,
            key: idx.toString(),
            t,
            isFull: showAllAttendees,
            isOrganizer: false,
            caption: busyCaption(a)
          })
        )}
    </>
  )
}
