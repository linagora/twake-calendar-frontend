import React, { useState } from 'react'
import { AvatarGroup, Box, Button, Typography } from '@linagora/twake-mui'
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import { useI18n } from 'twake-i18n'
import { userAttendee } from '@common/features/User/models/attendee'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { renderAttendeeBadge } from '@common/components/Event/utils/eventUtils'

interface BookingExtraAttendeesProps {
  extraAttendees: userAttendee[]
}

interface CollapsedAttendeesProps {
  extraAttendees: userAttendee[]
  isMobile: boolean
  onShowMore: () => void
  t: (key: string, options?: Record<string, string>) => string
}

const ATTENDEE_DISPLAY_LIMIT = 3

const CollapsedAttendees: React.FC<CollapsedAttendeesProps> = ({
  extraAttendees,
  onShowMore,
  t
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center'
    }}
  >
    <AvatarGroup
      max={ATTENDEE_DISPLAY_LIMIT}
      sx={{
        '& .MuiAvatar-root': {
          '&:last-child': {
            marginLeft: 'var(--AvatarGroup-spacing, -8px)'
          }
        }
      }}
    >
      {extraAttendees.map((a, idx) =>
        renderAttendeeBadge({
          a,
          key: idx.toString(),
          t,
          isFull: false
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
      onClick={onShowMore}
    >
      {t('eventPreview.showMore')}
    </Button>
  </Box>
)

const ExpandedAttendees: React.FC<{
  extraAttendees: userAttendee[]
  t: (key: string, options?: Record<string, string>) => string
}> = ({ extraAttendees, t }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {extraAttendees.map((a, idx) =>
      renderAttendeeBadge({
        a,
        key: idx.toString(),
        t,
        isFull: true,
        isOrganizer: false
      })
    )}
  </Box>
)

const ShowLessButton: React.FC<{
  onClick: () => void
  t: (key: string, options?: Record<string, string>) => string
}> = ({ onClick, t }) => (
  <Button
    variant="text"
    size="small"
    sx={{
      marginLeft: 2,
      fontSize: '14px',
      color: 'text.secondary',
      alignSelf: 'center'
    }}
    onClick={onClick}
  >
    {t('eventPreview.showLess')}
  </Button>
)

export function BookingExtraAttendees({
  extraAttendees
}: BookingExtraAttendeesProps): JSX.Element {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const [showAllAttendees, setShowAllAttendees] = useState(false)

  const handleShowLess = (): void => setShowAllAttendees(false)
  const handleShowMore = (): void => setShowAllAttendees(true)

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <GroupAddOutlinedIcon sx={{ color: 'text.secondary' }} />

        <Typography variant="body2" sx={{ mr: isMobile ? 0 : 2 }}>
          {t('eventPreview.extraAttendees', {
            smart_count: extraAttendees.length
          })}
        </Typography>

        {!showAllAttendees && (
          <CollapsedAttendees
            extraAttendees={extraAttendees}
            isMobile={isMobile}
            onShowMore={handleShowMore}
            t={t}
          />
        )}

        {showAllAttendees && <ShowLessButton onClick={handleShowLess} t={t} />}
      </Box>

      {showAllAttendees && (
        <ExpandedAttendees extraAttendees={extraAttendees} t={t} />
      )}
    </>
  )
}
