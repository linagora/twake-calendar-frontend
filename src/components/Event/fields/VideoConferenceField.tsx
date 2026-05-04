import iconCamera from '@/static/images/icon-camera.svg'
import {
  addVideoConferenceToDescription,
  generateMeetingLink,
  removeVideoConferenceFromDescription
} from '@/utils/videoConferenceUtils'
import { Box, Button, IconButton } from '@linagora/twake-mui'
import {
  Close as DeleteIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { SnackbarAlert } from '../../Loading/SnackBarAlert'
import { FieldWithLabel } from '../components/FieldWithLabel'
import { SectionPreviewRow } from '../components/SectionPreviewRow'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'

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

const VideoConferenceFieldInShortMode: React.FC<{
  hasVideoConference: boolean
  meetingLink: string | null
  cameraIcon: React.ReactNode
  handleCopyMeetingLink: () => Promise<void>
  handleDeleteVideoConference: () => void
  handleAddVideoConference: () => void
}> = ({
  hasVideoConference,
  meetingLink,
  cameraIcon,
  handleCopyMeetingLink,
  handleDeleteVideoConference,
  handleAddVideoConference
}) => {
  const { t } = useI18n()

  if (hasVideoConference && meetingLink) {
    return (
      <Box display="flex" gap={1} alignItems="center">
        <Button
          startIcon={cameraIcon}
          onClick={() =>
            window.open(meetingLink, '_blank', 'noopener,noreferrer')
          }
          size="medium"
          variant="contained"
          color="primary"
          sx={{ borderRadius: '4px', mr: 1 }}
        >
          {t('event.form.joinVisioConference')}
        </Button>
        <IconButton
          onClick={() => void handleCopyMeetingLink()}
          size="small"
          sx={{ color: 'primary.main' }}
          aria-label={t('event.form.copyMeetingLink')}
          title={t('event.form.copyMeetingLink')}
        >
          <CopyIcon />
        </IconButton>
        <IconButton
          onClick={handleDeleteVideoConference}
          size="small"
          sx={{ color: 'error.main' }}
          aria-label={t('event.form.removeVideoConference')}
          title={t('event.form.removeVideoConference')}
        >
          <DeleteIcon />
        </IconButton>
      </Box>
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
  handleCopyMeetingLink: () => Promise<void>
  handleDeleteVideoConference: () => void
  handleAddVideoConference: () => void
}> = ({
  hasVideoConference,
  meetingLink,
  cameraIcon,
  handleCopyMeetingLink,
  handleDeleteVideoConference,
  handleAddVideoConference
}) => {
  const { t } = useI18n()

  return (
    <Box display="flex" gap={1} alignItems="center">
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
          <Button
            startIcon={cameraIcon}
            onClick={() =>
              window.open(meetingLink, '_blank', 'noopener,noreferrer')
            }
            size="medium"
            variant="contained"
            color="primary"
            sx={{ borderRadius: '4px', mr: 1 }}
          >
            {t('event.form.joinVisioConference')}
          </Button>
          <IconButton
            onClick={() => void handleCopyMeetingLink()}
            size="small"
            sx={{ color: 'primary.main' }}
            aria-label={t('event.form.copyMeetingLink')}
            title={t('event.form.copyMeetingLink')}
          >
            <CopyIcon />
          </IconButton>
          <IconButton
            onClick={handleDeleteVideoConference}
            size="small"
            sx={{ color: 'error.main' }}
            aria-label={t('event.form.removeVideoConference')}
            title={t('event.form.removeVideoConference')}
          >
            <DeleteIcon />
          </IconButton>
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

  const [openToast, setOpenToast] = React.useState(false)

  const handleAddVideoConference = (): void => {
    const newMeetingLink = generateMeetingLink()
    const updatedDescription = addVideoConferenceToDescription(
      description,
      newMeetingLink
    )
    setDescription(updatedDescription)
    setHasVideoConference(true)
    setMeetingLink(newMeetingLink)
    if (showMore) {
      setShowDescription?.(true)
    }
  }

  const handleCopyMeetingLink = async (): Promise<void> => {
    if (!meetingLink) return
    try {
      await navigator.clipboard.writeText(meetingLink)
      setOpenToast(true)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleDeleteVideoConference = (): void => {
    setDescription(removeVideoConferenceFromDescription(description))
    setHasVideoConference(false)
    setMeetingLink(null)
  }

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
            handleCopyMeetingLink={handleCopyMeetingLink}
            handleDeleteVideoConference={handleDeleteVideoConference}
            handleAddVideoConference={handleAddVideoConference}
          />
        ) : (
          <VideoConferenceFieldInExpandedMode
            hasVideoConference={hasVideoConference}
            meetingLink={meetingLink}
            cameraIcon={cameraIcon}
            handleCopyMeetingLink={handleCopyMeetingLink}
            handleDeleteVideoConference={handleDeleteVideoConference}
            handleAddVideoConference={handleAddVideoConference}
          />
        )}
      </FieldWithLabel>

      <SnackbarAlert
        setOpen={setOpenToast}
        open={openToast}
        message={t('event.form.meetCopied')}
      />
    </>
  )
}
