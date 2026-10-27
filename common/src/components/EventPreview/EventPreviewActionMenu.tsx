import { ActionsMenu, ActionsMenuItem, ListItemText } from '@linagora/twake-mui'
import { useMemo } from 'react'
import { useI18n } from 'twake-i18n'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useAppSelector } from '@common/app/hooks'
import { buildMailComposerUrl, resolveMailSpaUrl } from '@linagora/twake-utils'

interface EventPreviewActionMenuProps {
  anchorEl: HTMLElement | null
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
  // ActionsMenu anchors on its ref, not on an anchorEl prop
  const anchorRef = useMemo(() => ({ current: anchorEl }), [anchorEl])
  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  const mailSpaUrl = resolveMailSpaUrl(window.MAIL_SPA_URL, {
    localpart: userEmail?.split('@')[0],
    workplaceFqdn,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })

  const attendees = event.attendee ?? []
  const otherAttendees = attendees.filter(
    a => a.cal_address !== userEmail && a.cutype !== 'RESOURCE'
  )
  const composeUrl = mailSpaUrl
    ? buildMailComposerUrl(
        mailSpaUrl,
        otherAttendees.map(a => a.cal_address),
        event.title ?? ''
      )
    : null

  return (
    <ActionsMenu ref={anchorRef} open={Boolean(anchorEl)} onClose={onClose}>
      {isEditable && (
        <ActionsMenuItem
          onClick={() => {
            onClose()
            onEdit()
          }}
        >
          <ListItemText primary={t('eventPreview.editEventSpecificSettings')} />
        </ActionsMenuItem>
      )}
      {composeUrl && (
        <ActionsMenuItem
          onClick={() => {
            onClose()
            window.open(composeUrl, '_blank', 'noopener,noreferrer')
          }}
        >
          <ListItemText primary={t('eventPreview.emailAttendees')} />
        </ActionsMenuItem>
      )}
      <ActionsMenuItem
        onClick={() => {
          onClose()
          onDuplicate()
        }}
      >
        <ListItemText primary={t('eventDuplication.duplicateEvent')} />
      </ActionsMenuItem>
    </ActionsMenu>
  )
}
