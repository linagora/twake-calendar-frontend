import { Box, Button, Drawer } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { MiniCalendar } from '@common/components/Calendar/MiniCalendar'
import { CalendarSidebarProps } from './SideBar'
import { SidebarCommonContent } from './SidebarCommonContent'
import Tooltip from '@common/components/Tooltip'
import { Icon, Plus } from '@linagora/twake-icons'

export const DesktopSidebar: React.FC<CalendarSidebarProps> = ({
  calendarRef,
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
          marginTop: 'calc(8px + var(--twake-bar-height, 0px))',
          height: 'calc(100% - 8px - var(--twake-bar-height, 0px))'
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
          backgroundColor: 'background.paper',
          paddingTop: '10px'
        }}
      >
        <Tooltip title={t('tooltip.createEvent')}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Icon size={12} icon={Plus} />}
            onClick={onCreateEvent}
            className="u-bdrs-6 u-fz-small"
          >
            {t('event.createEvent')}
          </Button>
        </Tooltip>
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
