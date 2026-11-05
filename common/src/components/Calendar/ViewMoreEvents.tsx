import type { EventApi, EventClickInfo } from '@fullcalendar/react'
import {
  ActionsMenu,
  ActionsMenuItem,
  ListItemIcon,
  ListItemText
} from '@linagora/twake-mui'
import RepeatIcon from '@mui/icons-material/Repeat'
import { useI18n } from 'twake-i18n'

interface ViewMoreEventsProps {
  isOpen: boolean
  onClose: () => void
  moreEvents: EventApi[]
  handleEventClick: (arg: EventClickInfo) => void
}

const ViewMoreEvents: React.FC<ViewMoreEventsProps> = ({
  isOpen,
  onClose,
  moreEvents,
  handleEventClick
}: ViewMoreEventsProps) => {
  const { t } = useI18n()

  return (
    <ActionsMenu
      open={isOpen}
      onClose={onClose}
      aria-label={t('common.moreEvents')}
    >
      {moreEvents.map((event, index) => (
        <ActionsMenuItem
          key={index}
          onClick={() =>
            handleEventClick({
              event,
              jsEvent: { preventDefault: () => {} }
            } as EventClickInfo)
          }
        >
          <ListItemText primary={event.title} ellipsis={false} />
          {event.extendedProps.recurrenceId && (
            <ListItemIcon>
              <RepeatIcon />
            </ListItemIcon>
          )}
        </ActionsMenuItem>
      ))}
    </ActionsMenu>
  )
}

export default ViewMoreEvents
