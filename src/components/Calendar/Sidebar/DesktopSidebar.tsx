import { Box, Button, Drawer, radius } from '@linagora/twake-mui'
import AddIcon from '@mui/icons-material/Add'
import { useI18n } from 'twake-i18n'
import { MiniCalendar } from '../MiniCalendar'
import { CalendarSidebarProps } from './SideBar'
import { SidebarCommonContent } from './SidebarCommonContent'

export const DesktopSidebar: React.FC<CalendarSidebarProps> = ({
  calendarRef,
  isIframe,
  onCreateEvent,
  selectedMiniDate,
  setSelectedMiniDate,
  tempUsers,
  setTempUsers,
  selectedCalendars,
  setSelectedCalendars
}) => {
  const { t } = useI18n()

  return (
    <Drawer
      variant="permanent"
      open
      className="sidebar"
      sx={{
        [`& .MuiDrawer-paper`]: {
          paddingTop: 0,
          paddingBottom: 3,
          paddingLeft: 3,
          paddingRight: 2,
          width: '270px',
          marginTop: isIframe ? 0 : '70px'
        },
        zIndex: 5
      }}
      slotProps={{ paper: { className: 'sidebar' } }}
    >
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

      <Box>
        <MiniCalendar
          calendarRef={calendarRef}
          selectedDate={selectedMiniDate}
          setSelectedMiniDate={setSelectedMiniDate}
        />
      </Box>

      <SidebarCommonContent
        onCreateEvent={onCreateEvent}
        tempUsers={tempUsers}
        setTempUsers={setTempUsers}
        selectedCalendars={selectedCalendars}
        setSelectedCalendars={setSelectedCalendars}
      />
    </Drawer>
  )
}
