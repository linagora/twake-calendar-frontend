import { Box, IconButton } from '@linagora/twake-mui'
import Tooltip from '@/components/Tooltip'
import { Delete } from '@mui/icons-material'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useI18n } from 'twake-i18n'
import { fetchEventIcs } from '../EventDao'
import { CalendarEvent } from '../EventsTypes'

interface EventPreviewHeaderProps {
  event: CalendarEvent
  eventId: string
  isOrganizer: boolean
  isOwn: boolean
  isWriteDelegated: boolean
  isNotPrivate: boolean
  canEdit: boolean
  onClose: () => void
  onEdit: () => void
  onMoreClick: (e: React.MouseEvent<HTMLElement>) => void
  onEditInOrganizerCalendar?: () => void
  editInOrganizerCalendarTooltip?: string
  onDelete: () => void
}

export function EventPreviewHeader({
  event,
  eventId,
  isOwn,
  isWriteDelegated,
  isNotPrivate,
  canEdit,
  onClose,
  onEdit,
  onMoreClick,
  onEditInOrganizerCalendar,
  editInOrganizerCalendarTooltip,
  onDelete
}: EventPreviewHeaderProps) {
  const { t } = useI18n()
  const canSeeMore = isNotPrivate || isOwn

  const handleDownload = async (): Promise<void> => {
    let url: string | null = null
    try {
      const icsContent = await fetchEventIcs(event)
      const blob = new Blob([icsContent], { type: 'text/calendar' })
      url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${eventId}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download ICS file:', error)
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }

  return (
    <Box
      display="flex"
      justifyContent="flex-end"
      alignItems="center"
      gap={2}
      width="100%"
    >
      {window.DEBUG && (
        <Tooltip title={t('tooltip.download')}>
          <IconButton
            size="small"
            aria-label={t('tooltip.download')}
            onClick={() => {
              void handleDownload()
            }}
          >
            <FileDownloadOutlinedIcon />
          </IconButton>
        </Tooltip>
      )}
      {canEdit && (
        <Tooltip title={t('tooltip.editEvent')}>
          <IconButton
            size="small"
            aria-label={t('tooltip.editEvent')}
            onClick={onEdit}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
      {(isOwn || isWriteDelegated) && (
        <Tooltip title={t('tooltip.deleteEvent')}>
          <IconButton
            size="small"
            aria-label={t('eventPreview.deleteEvent')}
            onClick={onDelete}
          >
            <Delete />
          </IconButton>
        </Tooltip>
      )}
      {!canEdit && onEditInOrganizerCalendar && (
        <Tooltip title={editInOrganizerCalendarTooltip} placement="top">
          <IconButton size="small" onClick={onEditInOrganizerCalendar}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
      {canSeeMore && (
        <IconButton size="small" onClick={onMoreClick}>
          <MoreVertIcon />
        </IconButton>
      )}
      <IconButton size="small" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </Box>
  )
}
