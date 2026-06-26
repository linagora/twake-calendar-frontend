import iconCamera from '@common/static/images/icon-camera.svg'
import { useVideoConference } from '../hooks/useVideoConference'
import { alpha, Box, Button, IconButton, useTheme } from '@linagora/twake-mui'
import { Close as DeleteIcon } from '@mui/icons-material'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { SectionPreviewRow } from '@common/components/Event/components/SectionPreviewRow'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { VideoLink } from '@common/components/Event/components/VideoLink'
import Tooltip from '@common/components/Tooltip'

export interface VideoConferenceFieldProps {
  hasVideoConference: boolean
  setHasVideoConference: (value: boolean) => void
  meetingLink: string | null
  setMeetingLink: (value: string | null) => void
  description: string
  setDescription: (value: string) => void
  showMore: boolean
  /** setShowDescription is called when a conference link is added in simple mode */
  setShowDescription?: (value: boolean) => void
}

const VideoConferenceHasLink: React.FC<{
  meetingLink: string | null
  cameraIcon: React.ReactNode
  handleDeleteVideoConference: () => void
}> = ({ meetingLink, cameraIcon, handleDeleteVideoConference }) => {
  const { t } = useI18n()
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <VideoLink
        meetingLink={meetingLink}
        icon={cameraIcon}
        label={t('event.form.joinVisioConference')}
      />
      <Tooltip title={t('event.form.removeVideoConference')}>
        <IconButton
          onClick={handleDeleteVideoConference}
          size="small"
          sx={{ color: alpha(theme.palette.grey[900], 0.9) }}
          aria-label={t('event.form.removeVideoConference')}
          title={t('event.form.removeVideoConference')}
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

const VideoConferenceFieldInShortMode: React.FC<{
  hasVideoConference: boolean
  meetingLink: string | null
  cameraIcon: React.ReactNode
  handleDeleteVideoConference: () => void
  handleAddVideoConference: () => void
}> = ({
  hasVideoConference,
  meetingLink,
  cameraIcon,
  handleDeleteVideoConference,
  handleAddVideoConference
}) => {
  const { t } = useI18n()

  if (hasVideoConference && meetingLink) {
    return (
      <VideoConferenceHasLink
        meetingLink={meetingLink}
        cameraIcon={cameraIcon}
        handleDeleteVideoConference={handleDeleteVideoConference}
      />
    )
  }

  return (
    <SectionPreviewRow icon={cameraIcon} onClick={handleAddVideoConference}>
      {t('event.form.addVisioConference')}
    </SectionPreviewRow>
  )
}

const VideoConferenceFieldInExpandedMode: React.FC<{
  hasVideoConference: boolean
  meetingLink: string | null
  cameraIcon: React.ReactNode
  handleDeleteVideoConference: () => void
  handleAddVideoConference: () => void
}> = ({
  hasVideoConference,
  meetingLink,
  cameraIcon,
  handleDeleteVideoConference,
  handleAddVideoConference
}) => {
  const { t } = useI18n()

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Button
        startIcon={cameraIcon}
        onClick={handleAddVideoConference}
        size="medium"
        variant="contained"
        color="secondary"
        sx={{
          borderRadius: '4px',
          display: hasVideoConference ? 'none' : 'flex'
        }}
      >
        {t('event.form.addVisioConference')}
      </Button>

      {hasVideoConference && meetingLink && (
        <>
          <VideoConferenceHasLink
            meetingLink={meetingLink}
            cameraIcon={cameraIcon}
            handleDeleteVideoConference={handleDeleteVideoConference}
          />
        </>
      )}
    </Box>
  )
}

export const VideoConferenceField: React.FC<VideoConferenceFieldProps> = ({
  hasVideoConference,
  setHasVideoConference,
  meetingLink,
  setMeetingLink,
  description,
  setDescription,
  showMore,
  setShowDescription
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const { handleAddVideoConference, handleDeleteVideoConference } =
    useVideoConference({
      description,
      setDescription,
      setHasVideoConference,
      setMeetingLink,
      showMore,
      setShowDescription
    })

  const cameraIcon = (
    <img src={iconCamera} alt="camera" width={24} height={24} />
  )

  return (
    <>
      <FieldWithLabel
        label={showMore ? t('event.form.videoMeeting') : ''}
        isExpanded={!isMobile && showMore}
      >
        {!showMore ? (
          <VideoConferenceFieldInShortMode
            hasVideoConference={hasVideoConference}
            meetingLink={meetingLink}
            cameraIcon={cameraIcon}
            handleDeleteVideoConference={handleDeleteVideoConference}
            handleAddVideoConference={handleAddVideoConference}
          />
        ) : (
          <VideoConferenceFieldInExpandedMode
            hasVideoConference={hasVideoConference}
            meetingLink={meetingLink}
            cameraIcon={cameraIcon}
            handleDeleteVideoConference={handleDeleteVideoConference}
            handleAddVideoConference={handleAddVideoConference}
          />
        )}
      </FieldWithLabel>
    </>
  )
}
