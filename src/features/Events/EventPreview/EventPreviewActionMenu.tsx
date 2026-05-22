import EventDuplication from '@/components/Event/EventDuplicate'
import { Menu, MenuItem } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { CalendarEvent } from '../EventsTypes'

interface EventPreviewActionMenuProps {
  anchorEl: Element | null
  isEditable: boolean
  event: CalendarEvent
  userEmail: string
  onClose: () => void
  onDuplicate: () => void
  onEdit: () => void
}

export const EventPreviewActionMenu: React.FC<EventPreviewActionMenuProps> = ({
  anchorEl,
  isEditable,
  event,
  userEmail,
  onClose,
  onDuplicate,
  onEdit
}) => {
  const { t } = useI18n()
  const mailSpaUrl = window.MAIL_SPA_URL ?? null

  const attendees = event.attendee ?? []
  const otherAttendees = attendees.filter(
    a => a.cal_address !== userEmail && a.cutype !== 'RESOURCE'
  )

  return (
    <Menu open={Boolean(anchorEl)} onClose={onClose} anchorEl={anchorEl}>
      {isEditable && (
        <MenuItem
          onClick={() => {
            onClose()
            onEdit()
          }}
        >
          {t('eventPreview.editEventSpecificSettings')}
        </MenuItem>
      )}
      {mailSpaUrl && otherAttendees.length > 0 && (
        <MenuItem
          onClick={() =>
            window.open(
              `${mailSpaUrl}/mailto/?uri=${encodeURIComponent(
                `mailto:${otherAttendees.map(a => a.cal_address).join(',')}`
              )}&subject=${encodeURIComponent(event.title ?? '')}`,
              '_blank',
              'noopener,noreferrer'
            )
          }
        >
          {t('eventPreview.emailAttendees')}
        </MenuItem>
      )}
      <EventDuplication
        onOpenDuplicate={() => {
          onClose()
          onDuplicate()
        }}
      />
    </Menu>
  )
}
