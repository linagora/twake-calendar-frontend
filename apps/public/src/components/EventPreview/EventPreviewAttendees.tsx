import { renderAttendeeBadge } from '@common/components/Event/utils/eventUtils'
import {
  alpha,
  Box,
  Tab,
  Tabs,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import React, { useState, useMemo } from 'react'
import { useI18n } from 'twake-i18n'
import { userAttendee } from '@common/features/User/models/attendee'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import { InfoRow } from '@common/components/Event/InfoRow'
import { useFilterEventAttendees } from '@common/components/Event/hooks/useFilterEventAttendees'
import { CalendarEvent } from '@common/types/EventsTypes'

export interface EventPreviewAttendeesProps {
  attendees: userAttendee[]
  organizer: userAttendee | undefined
  allAttendees: userAttendee[]
  start?: string
  end?: string
  timezone?: string
  eventUid?: string | null
}

export function EventPreviewAttendees({
  allAttendees,
  organizer
}: EventPreviewAttendeesProps): JSX.Element {
  const { t } = useI18n()
  const theme = useTheme()

  const [activeTab, setActiveTab] = useState(0)

  const {
    resources,
    eventAttendees: participants,
    attendees: attendeesWithoutOrganizer
  } = useFilterEventAttendees({
    event: {
      attendee: allAttendees,
      organizer: organizer ? { cal_address: organizer.cal_address } : undefined
    } as CalendarEvent
  })

  const showTabs = resources.length > 0

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ): void => {
    setActiveTab(newValue)
  }

  const acceptedCount = useMemo(() => {
    return participants.filter(a => a.partstat === 'ACCEPTED').length
  }, [participants])

  const declinedCount = useMemo(() => {
    return participants.filter(a => a.partstat === 'DECLINED').length
  }, [participants])

  const tentativeCount = useMemo(() => {
    return participants.filter(a => a.partstat === 'TENTATIVE').length
  }, [participants])

  const waitingCount = useMemo(() => {
    return participants.filter(
      a => a.partstat === 'NEEDS-ACTION' || !a.partstat
    ).length
  }, [participants])

  // Build the comma-separated status count subtitle
  const subtitle = useMemo(() => {
    const parts: string[] = []
    if (acceptedCount > 0) {
      parts.push(t('eventPreview.yesCount', { count: acceptedCount }))
    }
    if (declinedCount > 0) {
      parts.push(t('eventPreview.noCount', { count: declinedCount }))
    }
    if (tentativeCount > 0) {
      parts.push(t('eventPreview.maybeCount', { count: tentativeCount }))
    }
    if (waitingCount > 0) {
      parts.push(t('eventPreview.needActionCount', { count: waitingCount }))
    }
    return parts.join(', ')
  }, [acceptedCount, declinedCount, tentativeCount, waitingCount, t])

  const participantsCount =
    (organizer ? 1 : 0) + attendeesWithoutOrganizer.length
  const resourcesCount = resources.length

  const renderParticipantsList = (): JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '300px',
        overflowY: participantsCount > 5 ? 'auto' : 'hidden',
        mt: 2
      }}
    >
      {organizer &&
        renderAttendeeBadge({
          a: organizer,
          key: 'organizer',
          t,
          isFull: true,
          isOrganizer: true
        })}
      {attendeesWithoutOrganizer.map((a, idx) =>
        renderAttendeeBadge({
          a,
          key: `participant-${idx}`,
          t,
          isFull: true,
          isOrganizer: false
        })
      )}
    </Box>
  )

  const renderResourcesList = (): JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '300px',
        overflowY: resourcesCount > 5 ? 'auto' : 'hidden',
        mt: 2
      }}
    >
      {resources.map((r, idx) =>
        renderAttendeeBadge({
          a: r,
          key: `resource-${idx}`,
          t,
          isFull: true,
          isOrganizer: false
        })
      )}
    </Box>
  )

  return (
    <Box sx={{ width: '100%' }}>
      <InfoRow
        icon={
          <Box
            sx={{
              marginRight: 2,
              display: 'flex',
              alignItems: 'center',
              pt: '2px',
              color: alpha(theme.palette.grey[900], 0.9)
            }}
          >
            <PeopleAltOutlinedIcon />
          </Box>
        }
        content={
          <Box>
            <Typography variant="body1">
              {t('eventPreview.guests', { count: participants.length })}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        }
      />

      {showTabs ? (
        <>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              borderBottom: '1px solid ' + theme.palette.divider,
              '& .MuiTab-root': {
                textTransform: 'none',
                minWidth: '100px'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main'
              }
            }}
          >
            <Tab label={t('event.form.participants')} />
            <Tab label={t('calendar.resources')} />
          </Tabs>

          {activeTab === 0 ? renderParticipantsList() : renderResourcesList()}
        </>
      ) : (
        renderParticipantsList()
      )}
    </Box>
  )
}
