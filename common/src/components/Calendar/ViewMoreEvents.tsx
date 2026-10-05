import type { EventApi, EventClickArg } from '@fullcalendar/core'
import {
  List,
  ListItem,
  SwipeableDrawer,
  ListItemButton,
  ListItemText,
  ListItemIcon
} from '@linagora/twake-mui'
import RepeatIcon from '@mui/icons-material/Repeat'
import { useI18n } from 'twake-i18n'

interface ViewMoreEventsProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  moreEvents: EventApi[]
  handleEventClick: (arg: EventClickArg) => void
}

const ViewMoreEvents: React.FC<ViewMoreEventsProps> = ({
  isOpen,
  onOpen,
  onClose,
  moreEvents,
  handleEventClick
}: ViewMoreEventsProps) => {
  const { t } = useI18n()
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={isOpen}
      onClose={onClose}
      onOpen={onOpen}
      slotProps={{ paper: { 'aria-label': t('a11y.moreEvents') } }}
    >
      <List sx={{ p: 2, overflowY: 'auto' }}>
        {moreEvents.map((event, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton
              onClick={() => {
                onClose()
                handleEventClick({
                  event,
                  jsEvent: { preventDefault: () => {} }
                } as EventClickArg)
              }}
            >
              <ListItemText primary={event.title} />
              {event.extendedProps.recurrenceId && (
                <ListItemIcon>
                  <RepeatIcon />
                </ListItemIcon>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </SwipeableDrawer>
  )
}

export default ViewMoreEvents
