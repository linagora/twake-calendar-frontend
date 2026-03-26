import { CalendarApi } from '@fullcalendar/core'
import { Box, Button, Drawer, radius } from '@linagora/twake-mui'
import AddIcon from '@mui/icons-material/Add'
import { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useI18n } from 'twake-i18n'
import { User } from '../Attendees/PeopleSearch'
import CalendarSelection from './CalendarSelection'
import { MiniCalendar } from './MiniCalendar'
import { TempCalendarsInput } from './TempCalendarsInput'

interface CalendarSidebarProps {
  // Layout control — owned by CalendarLayout, passed down
  isTablet: boolean
  open: boolean
  onClose: () => void
  // Content
  calendarRef: MutableRefObject<CalendarApi | null>
  isIframe?: boolean
  onCreateEvent: () => void
  selectedMiniDate: Date
  setSelectedMiniDate: (date: Date) => void
  selectedCalendars: string[]
  setSelectedCalendars: Dispatch<SetStateAction<string[]>>
  tempUsers: User[]
  setTempUsers: Dispatch<SetStateAction<User[]>>
}

export default function Sidebar({
  isTablet,
  open,
  onClose,
  calendarRef,
  isIframe,
  onCreateEvent,
  selectedMiniDate,
  setSelectedMiniDate,
  selectedCalendars,
  setSelectedCalendars,
  tempUsers,
  setTempUsers
}: CalendarSidebarProps) {
  const { t } = useI18n()

  return (
    <Drawer
      variant={isTablet ? 'temporary' : 'permanent'}
      open={isTablet ? open : true}
      onClose={onClose}
      className="sidebar"
      sx={{
        [`& .MuiDrawer-paper`]: {
          paddingTop: 0,
          paddingBottom: 3,
          paddingLeft: 3,
          paddingRight: 2,
          width: '270px',
          marginTop: isTablet ? 0 : '70px'
        },
        zIndex: isTablet ? 3000 : 5
      }}
      slotProps={{ paper: { className: 'sidebar' } }}
    >
      {!isTablet && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: '#fff',
            paddingTop: isIframe ? '10px' : 3
          }}
        >
          <Button
            size="medium"
            variant="contained"
            fullWidth
            onClick={onCreateEvent}
            sx={{
              borderRadius: radius.lg,
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 'normal'
            }}
          >
            <AddIcon sx={{ marginRight: 0.5, fontSize: '20px' }} />{' '}
            {t('event.createEvent')}
          </Button>
        </Box>
      )}

      <Box>
        <MiniCalendar
          calendarRef={calendarRef}
          selectedDate={selectedMiniDate}
          setSelectedMiniDate={setSelectedMiniDate}
        />
      </Box>

      <Box sx={{ mb: 3, mt: 2 }}>
        <TempCalendarsInput
          tempUsers={tempUsers}
          setTempUsers={setTempUsers}
          handleToggleEventPreview={onCreateEvent}
        />
      </Box>

      <Box className="calendarList">
        <CalendarSelection
          selectedCalendars={selectedCalendars}
          setSelectedCalendars={setSelectedCalendars}
        />
      </Box>
    </Drawer>
  )
}
