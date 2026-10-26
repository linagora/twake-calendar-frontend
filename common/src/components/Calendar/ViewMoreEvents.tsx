import type { EventApi, EventClickArg } from '@fullcalendar/core'
import {
  ActionsMenu,
  ActionsMenuItem,
  ListItemIcon,
  ListItemText
} from '@linagora/twake-mui'
import RepeatIcon from '@mui/icons-material/Repeat'

interface ViewMoreEventsProps {
  isOpen: boolean
  onClose: () => void
  moreEvents: EventApi[]
  handleEventClick: (arg: EventClickArg) => void
}

const ViewMoreEvents: React.FC<ViewMoreEventsProps> = ({
  isOpen,
  onClose,
  moreEvents,
  handleEventClick
}: ViewMoreEventsProps) => {
  return (
    <ActionsMenu open={isOpen} onClose={onClose}>
      {moreEvents.map((event, index) => (
        <ActionsMenuItem
          key={index}
          onClick={() =>
            handleEventClick({
              event,
              jsEvent: { preventDefault: () => {} }
            } as EventClickArg)
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
